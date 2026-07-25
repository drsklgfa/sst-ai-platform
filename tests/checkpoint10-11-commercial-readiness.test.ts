import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import {
  buildAsaasChargePayload,
  buildMercadoPagoPreferencePayload,
  mercadoPagoSignatureManifest,
  normalizeAsaasWebhook,
  normalizeMercadoPagoWebhook,
  parseMercadoPagoSignature,
  verifyAsaasWebhookToken,
  verifyMercadoPagoWebhookSignature,
} from '../src/domain/commercial/payments.ts';
import {
  esocialRetryDelayMs,
  isRetryableEsocialHttpStatus,
  parseEsocialTransportResponse,
  validateSignedEsocialBatchXml,
} from '../src/domain/integrations/esocial-transport.ts';
import { evaluateReleaseReadiness } from '../src/domain/release/readiness.ts';

const paymentRoute = readFileSync('src/app/api/public/payments/webhook/[provider]/route.ts', 'utf8');
const checkoutRoute = readFileSync('src/app/api/billing/invoices/[id]/checkout/route.ts', 'utf8');
const paymentIntegration = readFileSync('src/lib/integrations/payments.ts', 'utf8');
const gatewayIntegration = readFileSync('src/lib/integrations/payment-gateways.ts', 'utf8');
const esocialIntegration = readFileSync('src/lib/esocial.ts', 'utf8');
const esocialTransport = readFileSync('src/lib/integrations/esocial-transmission.ts', 'utf8');
const signedBatchRoute = readFileSync('src/app/api/esocial/[id]/signed-batch/route.ts', 'utf8');
const worker = readFileSync('src/worker/processors.ts', 'utf8');
const envSource = readFileSync('src/lib/env.ts', 'utf8');
const entrypoint = readFileSync('docker/entrypoint.sh', 'utf8');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const releasePage = readFileSync('src/app/(app)/settings/release/page.tsx', 'utf8');
const releaseService = readFileSync('src/lib/release-readiness.ts', 'utf8');

const asaasToken = 'asaas-webhook-token-with-more-than-32-characters';
const mercadoSecret = 'mercado-pago-secret-with-at-least-24-characters';

test('token do webhook Asaas exige correspondência exata e tamanho seguro', () => {
  assert.equal(verifyAsaasWebhookToken(asaasToken, asaasToken), true);
  assert.equal(verifyAsaasWebhookToken(`${asaasToken}-wrong`, asaasToken), false);
  assert.equal(verifyAsaasWebhookToken('curto', 'curto'), false);
  assert.equal(verifyAsaasWebhookToken(null, asaasToken), false);
});

test('assinatura Mercado Pago usa manifesto documentado e rejeita timestamp vencido', () => {
  const now = 1_753_248_000;
  const dataId = 'PAYMENT-123';
  const requestId = 'request-abc';
  const timestamp = String(now);
  const manifest = mercadoPagoSignatureManifest({ dataId, requestId, timestamp });
  assert.equal(manifest, `id:payment-123;request-id:${requestId};ts:${timestamp};`);
  const signature = createHmac('sha256', mercadoSecret).update(manifest).digest('hex');
  const header = `ts=${timestamp},v1=${signature}`;
  assert.deepEqual(parseMercadoPagoSignature(header), { ts: timestamp, v1: signature });
  assert.equal(verifyMercadoPagoWebhookSignature({ xSignature: header, xRequestId: requestId, dataId, secret: mercadoSecret, nowSeconds: now }), true);
  assert.equal(verifyMercadoPagoWebhookSignature({ xSignature: header, xRequestId: requestId, dataId, secret: mercadoSecret, nowSeconds: now + 901 }), false);
  assert.equal(verifyMercadoPagoWebhookSignature({ xSignature: header, xRequestId: 'other', dataId, secret: mercadoSecret, nowSeconds: now }), false);
});

test('normalização de webhooks preserva IDs do evento e do recurso', () => {
  assert.deepEqual(normalizeAsaasWebhook({ id: 'evt-1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay-1', status: 'RECEIVED' } }), {
    externalId: 'evt-1', eventType: 'PAYMENT_RECEIVED', resourceId: 'pay-1', status: 'PAID',
  });
  assert.deepEqual(normalizeMercadoPagoWebhook({ id: 'evt-2', action: 'payment.updated', data: { id: 'pay-2' } }), {
    externalId: 'evt-2', eventType: 'payment.updated', resourceId: 'pay-2', status: null,
  });
});

test('payload de cobrança Asaas usa centavos, vencimento e referência idempotente', () => {
  assert.deepEqual(buildAsaasChargePayload({ customerId: 'cus_1', invoiceId: 'inv_1', description: 'Mensalidade', amountCents: 12345, dueDate: new Date('2026-08-31T12:00:00Z'), billingType: 'PIX' }), {
    customer: 'cus_1', billingType: 'PIX', value: 123.45, dueDate: '2026-08-31', description: 'Mensalidade', externalReference: 'inv_1',
  });
  assert.throws(() => buildAsaasChargePayload({ customerId: '', invoiceId: 'inv', description: 'x', amountCents: 1, dueDate: new Date() }), /Cliente Asaas/);
});

test('preferência Mercado Pago contém retorno, notificação e referência da fatura', () => {
  const payload = buildMercadoPagoPreferencePayload({
    invoiceId: 'inv_2', description: 'Plano SST', amountCents: 9900, payerEmail: 'financeiro@example.com',
    notificationUrl: 'https://app.example.com/webhook', successUrl: 'https://app.example.com/success', pendingUrl: 'https://app.example.com/pending', failureUrl: 'https://app.example.com/failure',
  });
  assert.equal(payload.external_reference, 'inv_2');
  assert.equal(payload.items[0].unit_price, 99);
  assert.equal(payload.metadata.invoice_id, 'inv_2');
  assert.deepEqual(payload.payer, { email: 'financeiro@example.com' });
});

test('lote eSocial exige XML assinado e rejeita entidades externas', () => {
  const valid = '<eSocial><envioLoteEventos><eventos/><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">abc</Signature></envioLoteEventos></eSocial>';
  assert.equal(validateSignedEsocialBatchXml(valid).valid, true);
  const unsigned = validateSignedEsocialBatchXml('<eSocial><envioLoteEventos/></eSocial>');
  assert.equal(unsigned.valid, false);
  assert.ok(unsigned.errors.includes('Assinatura XMLDSig ausente'));
  const xxe = validateSignedEsocialBatchXml('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><eSocial><envioLoteEventos><Signature>&e;</Signature></envioLoteEventos></eSocial>');
  assert.equal(xxe.valid, false);
  assert.ok(xxe.errors.includes('DOCTYPE e ENTITY não são permitidos'));
});

test('resposta eSocial extrai código, descrição e recibo sem depender de namespace', () => {
  const parsed = parseEsocialTransportResponse('<soap:Envelope><cdResposta>201</cdResposta><descResposta>Lote recebido</descResposta><nrRecibo>1.2.000</nrRecibo></soap:Envelope>');
  assert.deepEqual(parsed, { responseCode: '201', description: 'Lote recebido', receiptNumber: '1.2.000', accepted: true });
  assert.equal(parseEsocialTransportResponse('<cdResposta>401</cdResposta><descResposta>Rejeitado</descResposta>').accepted, false);
});

test('retentativa eSocial é limitada e somente erros transitórios são repetíveis', () => {
  assert.equal(esocialRetryDelayMs(1), 15_000);
  assert.ok(esocialRetryDelayMs(8) <= 600_000);
  for (const status of [408, 425, 429, 500, 503]) assert.equal(isRetryableEsocialHttpStatus(status), true);
  for (const status of [200, 400, 401, 422]) assert.equal(isRetryableEsocialHttpStatus(status), false);
});

test('readiness de produção bloqueia HTTP, db push, storage local e ausência de backup', () => {
  const result = evaluateReleaseReadiness({
    deployEnvironment: 'production', appUrl: 'http://app.example.com', dbSchemaMode: 'push', storageDriver: 'local', workerStatus: 'STALE', failedJobs: 4,
    backupAgeDays: null, recoveryTestAgeDays: null, openCriticalIncidents: 1, emailProvider: 'disabled', billingEnabled: true, paymentProvider: 'asaas', paymentConfigured: false,
    esocialEnabled: true, esocialTransportMode: 'disabled', esocialConfigured: false, releaseVersion: 'development',
  });
  assert.equal(result.status, 'BLOCKED');
  for (const code of ['HTTPS', 'DB_MIGRATIONS', 'PRIVATE_STORAGE', 'WORKER', 'FAILED_JOBS', 'BACKUP', 'RESTORE_DRILL', 'SECURITY_INCIDENTS', 'BILLING', 'ESOCIAL']) {
    assert.equal(result.checks.find((item) => item.code === code)?.status, 'BLOCKED');
  }
});

test('readiness retorna READY quando todos os portões comerciais estão atendidos', () => {
  const result = evaluateReleaseReadiness({
    deployEnvironment: 'production', appUrl: 'https://sst.example.com', dbSchemaMode: 'migrate', storageDriver: 's3', workerStatus: 'OK', failedJobs: 0,
    backupAgeDays: 1, recoveryTestAgeDays: 7, openCriticalIncidents: 0, emailProvider: 'resend', billingEnabled: true, paymentProvider: 'mercado_pago', paymentConfigured: true,
    esocialEnabled: true, esocialTransportMode: 'external_signed_xml', esocialConfigured: true, releaseVersion: '1.2.0',
  });
  assert.equal(result.status, 'READY');
  assert.equal(result.blocked, 0);
  assert.equal(result.warnings, 0);
  assert.equal(result.score, 100);
});

test('webhooks usam autenticação específica, fila assíncrona e consulta autoritativa', () => {
  assert.match(paymentRoute, /asaas-access-token/);
  assert.match(paymentRoute, /x-signature/);
  assert.match(paymentRoute, /x-request-id/);
  assert.match(paymentRoute, /ingestPaymentWebhook/);
  assert.match(paymentIntegration, /PAYMENT_WEBHOOK_PROCESS/);
  assert.match(paymentIntegration, /fetchProviderPaymentStatus/);
  assert.match(paymentIntegration, /status: 'PROCESSING'/);
  assert.match(gatewayIntegration, /api-sandbox\.asaas\.com/);
  assert.match(gatewayIntegration, /api\.mercadopago\.com\/checkout\/preferences/);
  assert.match(worker, /case 'PAYMENT_WEBHOOK_PROCESS'/);
});

test('checkout externo exige permissão financeira e mantém credenciais no servidor', () => {
  assert.match(checkoutRoute, /authorizeTenantApi\('billing\.manage'\)/);
  assert.match(checkoutRoute, /createExternalInvoiceCheckout/);
  assert.doesNotMatch(checkoutRoute, /ASAAS_API_KEY|MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(envSource, /ASAAS_WEBHOOK_TOKEN/);
  assert.match(envSource, /MERCADO_PAGO_WEBHOOK_SECRET/);
});

test('transmissão eSocial exige XML assinado, certificado e fila do Worker', () => {
  assert.match(esocialIntegration, /XML assinado obrigatório antes da transmissão/);
  assert.match(esocialIntegration, /ESOCIAL_TRANSMIT/);
  assert.match(esocialTransport, /minVersion: 'TLSv1\.2'/);
  assert.match(esocialTransport, /pfx/);
  assert.match(esocialTransport, /validateSignedEsocialBatchXml/);
  assert.match(worker, /case 'ESOCIAL_TRANSMIT'/);
  assert.match(signedBatchRoute, /authorizeTenantApi\('esocial\.transmit'\)/);
  assert.match(signedBatchRoute, /ESOCIAL_SIGNED_BATCH_ATTACHED/);
  assert.match(signedBatchRoute, /after: \{ sha256:/);
  assert.doesNotMatch(signedBatchRoute, /after: \{ signedBatchXml:/);
  assert.doesNotMatch(esocialTransport, /signXml|createSignature|privateKeyPem/);
});

test('baseline e entrypoint separam bootstrap de migrate sem db push em produção', () => {
  assert.equal(existsSync('prisma/migrations/migration_lock.toml'), true);
  assert.equal(existsSync('prisma/migrations/20260723000000_existing_schema_baseline/migration.sql'), true);
  const baseline = readFileSync('prisma/migrations/20260723000000_existing_schema_baseline/migration.sql', 'utf8');
  assert.match(baseline, /SELECT 1/);
  assert.match(entrypoint, /bootstrap\)/);
  assert.match(entrypoint, /migrate\)/);
  assert.match(entrypoint, /prisma migrate resolve/);
  assert.match(entrypoint, /prisma migrate deploy/);
  assert.match(entrypoint, /node scripts\/preflight\.mjs/);
  assert.match(entrypoint, /SERVICE_ROLE/);
});

test('CI contém drift, smoke E2E, backup drill, auditoria, SBOM e artefatos', () => {
  for (const pattern of [/prisma migrate diff/, /e2e:smoke/, /backup:drill/, /npm audit/, /npm sbom/, /actions\/upload-artifact@v4/, /DB_SCHEMA_MODE=bootstrap/, /DB_SCHEMA_MODE=none/]) assert.match(ci, pattern);
});

test('painel de homologação consulta dados operacionais reais e não só configurações', () => {
  assert.match(releasePage, /Prontidão para lançamento/);
  assert.match(releasePage, /getReleaseReadiness/);
  assert.match(releaseService, /backupExport\.findFirst/);
  assert.match(releaseService, /recoveryTest\.findFirst/);
  assert.match(releaseService, /securityIncident\.count/);
  assert.match(releaseService, /latestServiceHeartbeat/);
});
