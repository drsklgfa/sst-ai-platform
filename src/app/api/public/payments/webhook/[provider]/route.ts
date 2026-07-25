import type { PaymentProvider } from '@prisma/client';
import { env } from '@/lib/env';
import { ingestPaymentWebhook, normalizeAsaasWebhook, normalizeMercadoPagoWebhook, verifyAsaasWebhookToken, verifyMercadoPagoWebhookSignature } from '@/lib/integrations/payments';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  if (!env.FEATURE_BILLING || env.PAYMENT_PROVIDER === 'disabled') return new Response('Cobrança desativada', { status: 404 });
  const limit = checkRateLimit(`payment-webhook:${requestAddress(request.headers)}`, 240, 60_000);
  if (!limit.allowed) return new Response('Muitas solicitações', { status: 429 });
  const { provider } = await params;
  const normalizedProvider: PaymentProvider | null = provider === 'asaas' ? 'ASAAS' : provider === 'mercado-pago' ? 'MERCADO_PAGO' : null;
  if (!normalizedProvider) return new Response('Provedor não suportado', { status: 404 });

  let payload: Record<string, unknown>;
  try { payload = await request.json() as Record<string, unknown>; } catch { return new Response('JSON inválido', { status: 400 }); }
  const url = new URL(request.url);

  if (normalizedProvider === 'ASAAS') {
    const token = request.headers.get('asaas-access-token');
    const signatureValid = verifyAsaasWebhookToken(token, env.ASAAS_WEBHOOK_TOKEN ?? '');
    const normalized = normalizeAsaasWebhook(payload);
    if (!normalized.externalId || !normalized.resourceId) return new Response('Evento Asaas incompleto', { status: 400 });
    const result = await ingestPaymentWebhook({ provider: normalizedProvider, externalId: normalized.externalId, eventType: normalized.eventType, signatureValid, payload, resourceId: normalized.resourceId });
    return Response.json({ received: true, queued: result.queued }, { status: signatureValid ? 200 : 401 });
  }

  const normalized = normalizeMercadoPagoWebhook(payload, url.searchParams.get('data.id') ?? url.searchParams.get('data_id'));
  const signatureValid = verifyMercadoPagoWebhookSignature({
    xSignature: request.headers.get('x-signature'),
    xRequestId: request.headers.get('x-request-id'),
    dataId: normalized.resourceId,
    secret: env.MERCADO_PAGO_WEBHOOK_SECRET ?? '',
  });
  if (!normalized.externalId || !normalized.resourceId) return new Response('Evento Mercado Pago incompleto', { status: 400 });
  const result = await ingestPaymentWebhook({ provider: normalizedProvider, externalId: normalized.externalId, eventType: normalized.eventType, signatureValid, payload, resourceId: normalized.resourceId });
  return Response.json({ received: true, queued: result.queued }, { status: signatureValid ? 200 : 401 });
}
