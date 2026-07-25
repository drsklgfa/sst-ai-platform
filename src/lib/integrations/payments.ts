import type { PaymentProvider } from '@prisma/client';
import { db } from '@/lib/db';
import { registerPaymentWebhook, transitionBillingInvoice } from '@/lib/billing';
import { normalizeAsaasWebhook, normalizeMercadoPagoWebhook, normalizePaymentStatus, verifyAsaasWebhookToken, verifyMercadoPagoWebhookSignature, verifyPaymentWebhookSignature } from '@/domain/commercial/payments';
import { createAsaasCheckout, createMercadoPagoCheckout, fetchProviderPaymentStatus } from './payment-gateways';
import { toPrismaJson } from '@/lib/prisma-json';

export { normalizeAsaasWebhook, normalizeMercadoPagoWebhook, normalizePaymentStatus, verifyAsaasWebhookToken, verifyMercadoPagoWebhookSignature, verifyPaymentWebhookSignature } from '@/domain/commercial/payments';

export async function createExternalInvoiceCheckout(input: { tenantId: string; invoiceId: string; payerEmail?: string | null }) {
  const invoice = await db.billingInvoice.findFirst({ where: { id: input.invoiceId, tenantId: input.tenantId } });
  if (!invoice) throw new Error('Fatura não encontrada');
  if (!['DRAFT', 'OPEN', 'OVERDUE'].includes(invoice.status)) throw new Error('A fatura não aceita criação de checkout neste estado');
  const subscription = invoice.subscriptionId ? await db.tenantSubscription.findFirst({ where: { id: invoice.subscriptionId, tenantId: input.tenantId } }) : null;
  const result = invoice.provider === 'ASAAS'
    ? await createAsaasCheckout({ invoice, subscription })
    : invoice.provider === 'MERCADO_PAGO'
      ? await createMercadoPagoCheckout({ invoice, payerEmail: input.payerEmail })
      : null;
  if (!result) throw new Error('Fatura não utiliza gateway externo suportado');
  const updated = await db.billingInvoice.update({
    where: { id: invoice.id },
    data: {
      status: result.normalizedStatus === 'PAID' ? 'PAID' : 'OPEN',
      providerInvoiceId: result.providerInvoiceId,
      checkoutUrl: result.checkoutUrl,
      pixPayload: result.pixPayload,
      paidAt: result.normalizedStatus === 'PAID' ? new Date() : invoice.paidAt,
      metadata: toPrismaJson({ ...(invoice.metadata && typeof invoice.metadata === 'object' && !Array.isArray(invoice.metadata) ? invoice.metadata as Record<string, unknown> : {}), gatewayStatus: result.rawStatus, checkoutCreatedAt: new Date().toISOString() }),
    },
  });
  return { invoice: updated, checkout: result };
}

export async function ingestPaymentWebhook(input: { provider: PaymentProvider; externalId: string; eventType: string; signatureValid: boolean; payload: Record<string, unknown>; tenantId?: string | null; resourceId?: string | null }) {
  const event = await registerPaymentWebhook(input);
  if (!input.signatureValid) return { event, queued: false, reason: 'assinatura inválida' };
  if (event.status === 'PROCESSED' || event.status === 'PROCESSING') return { event, queued: false, reason: 'evento já recebido' };
  const tenantId = input.tenantId ?? event.tenantId;
  if (!tenantId) {
    const providerInvoiceId = input.resourceId?.trim();
    const invoice = providerInvoiceId ? await db.billingInvoice.findFirst({ where: { provider: input.provider, providerInvoiceId } }) : null;
    if (invoice) await db.paymentWebhookEvent.update({ where: { id: event.id }, data: { tenantId: invoice.tenantId } });
  }
  const resolved = await db.paymentWebhookEvent.findUniqueOrThrow({ where: { id: event.id } });
  if (!resolved.tenantId) {
    await db.paymentWebhookEvent.update({ where: { id: event.id }, data: { status: 'IGNORED', processedAt: new Date(), error: 'Não foi possível associar o evento a uma consultoria' } });
    return { event: resolved, queued: false, reason: 'consultoria não identificada' };
  }
  await db.job.create({ data: { tenantId: resolved.tenantId, type: 'PAYMENT_WEBHOOK_PROCESS', payload: toPrismaJson({ eventId: event.id, resourceId: input.resourceId ?? null }), maxAttempts: 6 } });
  return { event: resolved, queued: true };
}

export async function processPaymentWebhookEvent(input: { eventId: string; resourceId?: string | null }) {
  const event = await db.paymentWebhookEvent.findUnique({ where: { id: input.eventId } });
  if (!event) throw new Error('Evento de pagamento não encontrado');
  if (!event.signatureValid || event.status === 'IGNORED') return { processed: false, reason: 'evento não autenticado' };
  if (event.status === 'PROCESSED') return { processed: true, duplicate: true };
  const claimed = await db.paymentWebhookEvent.updateMany({ where: { id: event.id, status: { in: ['RECEIVED', 'FAILED'] } }, data: { status: 'PROCESSING', error: null } });
  if (claimed.count === 0) return { processed: false, reason: 'evento em processamento' };
  try {
    const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
    const normalizedWebhook = event.provider === 'ASAAS' ? normalizeAsaasWebhook(payload) : normalizeMercadoPagoWebhook(payload, input.resourceId);
    const resourceId = input.resourceId?.trim() || normalizedWebhook.resourceId;
    if (!resourceId) throw new Error('Webhook sem ID do recurso de pagamento');
    const authoritative = await fetchProviderPaymentStatus(event.provider, resourceId);
    const normalized = authoritative.normalizedStatus ?? normalizedWebhook.status;
    const invoiceIdFromMetadata = authoritative.body.metadata && typeof authoritative.body.metadata === 'object' && !Array.isArray(authoritative.body.metadata)
      ? String((authoritative.body.metadata as Record<string, unknown>).invoice_id ?? '').trim()
      : '';
    const externalReference = String(authoritative.body.externalReference ?? authoritative.body.external_reference ?? '').trim();
    const invoice = await db.billingInvoice.findFirst({ where: { OR: [{ provider: event.provider, providerInvoiceId: resourceId }, ...(invoiceIdFromMetadata ? [{ id: invoiceIdFromMetadata }] : []), ...(externalReference ? [{ id: externalReference }] : [])] } });
    if (!invoice) throw new Error('Fatura não encontrada para o recurso confirmado no gateway');
    if (normalized && invoice.status !== normalized) {
      if (normalized === 'OPEN' && invoice.status !== 'DRAFT') {
        // Estados pendentes do gateway não reabrem faturas encerradas.
      } else {
        await transitionBillingInvoice({ tenantId: invoice.tenantId, invoiceId: invoice.id, nextStatus: normalized });
      }
    }
    await db.paymentWebhookEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date(), tenantId: invoice.tenantId, payload: toPrismaJson({ webhook: payload, authoritative: authoritative.body }) } });
    return { processed: true, invoiceId: invoice.id, status: normalized };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.paymentWebhookEvent.update({ where: { id: event.id }, data: { status: 'FAILED', processedAt: new Date(), error: message } });
    throw error;
  }
}

/** Backward-compatible synchronous entry point, now backed by authoritative status lookup. */
export async function processPaymentWebhook(input: { provider: PaymentProvider; externalId: string; eventType: string; signatureValid: boolean; payload: Record<string, unknown>; tenantId?: string | null; resourceId?: string | null }) {
  const ingested = await ingestPaymentWebhook(input);
  if (!ingested.queued) return { event: ingested.event, processed: false, reason: ingested.reason };
  return { event: ingested.event, processed: false, queued: true };
}
