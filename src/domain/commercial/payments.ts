import { createHmac, timingSafeEqual } from 'node:crypto';

function safeTextEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Legacy generic HMAC helper kept for custom providers. */
export function verifyPaymentWebhookSignature(rawBody: string, provided: string | null, secret: string) {
  if (!provided || secret.length < 24) return false;
  const normalized = provided.replace(/^sha256=/, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeTextEqual(expected, normalized);
}

/** Asaas sends the configured auth token in the asaas-access-token header. */
export function verifyAsaasWebhookToken(provided: string | null, configuredToken: string) {
  if (!provided || configuredToken.length < 32 || configuredToken.length > 255) return false;
  return safeTextEqual(provided.trim(), configuredToken.trim());
}

export function parseMercadoPagoSignature(value: string | null) {
  const parts = Object.fromEntries(String(value ?? '').split(',').map((part) => part.trim().split('=', 2)).filter((entry) => entry.length === 2));
  const ts = String(parts.ts ?? '').trim();
  const v1 = String(parts.v1 ?? '').trim().toLowerCase();
  if (!/^\d{10,16}$/.test(ts) || !/^[a-f0-9]{64}$/.test(v1)) return null;
  return { ts, v1 };
}

export function mercadoPagoSignatureManifest(input: { dataId: string; requestId: string; timestamp: string }) {
  return `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${input.timestamp};`;
}

/** Mercado Pago validates x-signature using data.id, x-request-id and ts. */
export function verifyMercadoPagoWebhookSignature(input: { xSignature: string | null; xRequestId: string | null; dataId: string | null; secret: string; nowSeconds?: number; toleranceSeconds?: number }) {
  if (!input.xRequestId || !input.dataId || input.secret.length < 24) return false;
  const parsed = parseMercadoPagoSignature(input.xSignature);
  if (!parsed) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? 15 * 60;
  const timestamp = Number(parsed.ts);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > tolerance) return false;
  const manifest = mercadoPagoSignatureManifest({ dataId: input.dataId, requestId: input.xRequestId, timestamp: parsed.ts });
  const expected = createHmac('sha256', input.secret).update(manifest).digest('hex');
  return safeTextEqual(expected, parsed.v1);
}

export function normalizePaymentStatus(value: unknown) {
  const status = String(value ?? '').trim().toLowerCase();
  if (['paid', 'received', 'confirmed', 'approved', 'payment_received', 'payment_confirmed', 'payment_approved'].includes(status)) return 'PAID' as const;
  if (['overdue', 'past_due', 'late', 'payment_overdue'].includes(status)) return 'OVERDUE' as const;
  if (['refunded', 'chargeback', 'payment_refunded', 'payment_chargeback_requested', 'payment_chargeback_dispute'].includes(status)) return 'REFUNDED' as const;
  if (['cancelled', 'canceled', 'void', 'deleted', 'payment_deleted'].includes(status)) return 'VOID' as const;
  if (['pending', 'in_process', 'authorized', 'created', 'payment_created', 'payment_updated'].includes(status)) return 'OPEN' as const;
  return null;
}

export function normalizeAsaasWebhook(input: Record<string, unknown>) {
  const payment = input.payment && typeof input.payment === 'object' && !Array.isArray(input.payment) ? input.payment as Record<string, unknown> : {};
  const eventType = String(input.event ?? input.type ?? 'unknown');
  const externalId = String(input.id ?? input.eventId ?? `${eventType}:${payment.id ?? ''}`).trim();
  const resourceId = String(payment.id ?? input.paymentId ?? '').trim();
  const status = normalizePaymentStatus(eventType) ?? normalizePaymentStatus(payment.status);
  return { externalId, eventType, resourceId, status };
}

export function normalizeMercadoPagoWebhook(input: Record<string, unknown>, queryDataId?: string | null) {
  const data = input.data && typeof input.data === 'object' && !Array.isArray(input.data) ? input.data as Record<string, unknown> : {};
  const resourceId = String(queryDataId ?? data.id ?? input.data_id ?? '').trim();
  const eventType = String(input.action ?? input.type ?? 'unknown');
  const externalId = String(input.id ?? `${eventType}:${resourceId}`).trim();
  return { externalId, eventType, resourceId, status: normalizePaymentStatus(input.status) };
}

export function buildAsaasChargePayload(input: { customerId: string; invoiceId: string; description: string; amountCents: number; dueDate: Date; billingType?: 'UNDEFINED' | 'PIX' | 'BOLETO' | 'CREDIT_CARD' }) {
  if (!input.customerId.trim()) throw new Error('Cliente Asaas é obrigatório');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Valor da cobrança deve ser positivo');
  return {
    customer: input.customerId.trim(),
    billingType: input.billingType ?? 'UNDEFINED',
    value: input.amountCents / 100,
    dueDate: input.dueDate.toISOString().slice(0, 10),
    description: input.description.trim(),
    externalReference: input.invoiceId,
  };
}

export function buildMercadoPagoPreferencePayload(input: { invoiceId: string; description: string; amountCents: number; payerEmail?: string | null; notificationUrl: string; successUrl: string; pendingUrl: string; failureUrl: string }) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error('Valor da cobrança deve ser positivo');
  return {
    items: [{ id: input.invoiceId, title: input.description.trim(), quantity: 1, currency_id: 'BRL', unit_price: input.amountCents / 100 }],
    external_reference: input.invoiceId,
    notification_url: input.notificationUrl,
    back_urls: { success: input.successUrl, pending: input.pendingUrl, failure: input.failureUrl },
    auto_return: 'approved',
    ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
    metadata: { invoice_id: input.invoiceId },
  };
}
