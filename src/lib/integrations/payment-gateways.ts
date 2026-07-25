import type { BillingInvoice, PaymentProvider, TenantSubscription } from '@prisma/client';
import { buildAsaasChargePayload, buildMercadoPagoPreferencePayload, normalizePaymentStatus } from '@/domain/commercial/payments';
import { env } from '@/lib/env';

export type CheckoutResult = {
  provider: PaymentProvider;
  providerInvoiceId: string;
  checkoutUrl: string | null;
  pixPayload: string | null;
  rawStatus: string | null;
  normalizedStatus: ReturnType<typeof normalizePaymentStatus>;
};

async function requestJson(url: string, init: RequestInit, timeoutMs = env.PAYMENT_HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = { message: text.slice(0, 1000) }; }
    }
    if (!response.ok) {
      const detail = body && typeof body === 'object' ? JSON.stringify(body).slice(0, 1200) : String(body ?? '');
      throw new Error(`Gateway respondeu HTTP ${response.status}: ${detail}`);
    }
    return body as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function asaasBaseUrl() {
  return env.PAYMENT_ENVIRONMENT === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

export async function createAsaasCheckout(input: { invoice: BillingInvoice; subscription: TenantSubscription | null }) : Promise<CheckoutResult> {
  if (!env.ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
  const customerId = input.subscription?.providerCustomerId?.trim();
  if (!customerId) throw new Error('Assinatura sem providerCustomerId do Asaas');
  const payload = buildAsaasChargePayload({ customerId, invoiceId: input.invoice.id, description: input.invoice.description, amountCents: input.invoice.amountCents, dueDate: input.invoice.dueAt });
  const body = await requestJson(`${asaasBaseUrl()}/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', access_token: env.ASAAS_API_KEY, 'user-agent': 'sst-saas-platform/10.11' },
    body: JSON.stringify(payload),
  });
  const id = String(body.id ?? '').trim();
  if (!id) throw new Error('Asaas não retornou o ID da cobrança');
  let pixPayload: string | null = null;
  if (String(body.billingType ?? '') === 'PIX') {
    const pix = await requestJson(`${asaasBaseUrl()}/payments/${encodeURIComponent(id)}/pixQrCode`, { headers: { access_token: env.ASAAS_API_KEY, 'user-agent': 'sst-saas-platform/10.11' } });
    pixPayload = String(pix.payload ?? '').trim() || null;
  }
  const rawStatus = String(body.status ?? '').trim() || null;
  return { provider: 'ASAAS', providerInvoiceId: id, checkoutUrl: String(body.invoiceUrl ?? body.bankSlipUrl ?? '').trim() || null, pixPayload, rawStatus, normalizedStatus: normalizePaymentStatus(rawStatus) };
}

export async function createMercadoPagoCheckout(input: { invoice: BillingInvoice; payerEmail?: string | null }) : Promise<CheckoutResult> {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
  const app = env.APP_URL.replace(/\/$/, '');
  const payload = buildMercadoPagoPreferencePayload({
    invoiceId: input.invoice.id,
    description: input.invoice.description,
    amountCents: input.invoice.amountCents,
    payerEmail: input.payerEmail,
    notificationUrl: `${app}/api/public/payments/webhook/mercado-pago`,
    successUrl: `${app}/settings/billing?payment=success`,
    pendingUrl: `${app}/settings/billing?payment=pending`,
    failureUrl: `${app}/settings/billing?payment=failure`,
  });
  const body = await requestJson('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`, 'x-idempotency-key': input.invoice.id },
    body: JSON.stringify(payload),
  });
  const id = String(body.id ?? '').trim();
  if (!id) throw new Error('Mercado Pago não retornou o ID da preferência');
  const checkoutUrl = String(env.PAYMENT_ENVIRONMENT === 'production' ? body.init_point ?? '' : body.sandbox_init_point ?? body.init_point ?? '').trim() || null;
  return { provider: 'MERCADO_PAGO', providerInvoiceId: id, checkoutUrl, pixPayload: null, rawStatus: null, normalizedStatus: null };
}

export async function fetchProviderPaymentStatus(provider: PaymentProvider, resourceId: string) {
  if (provider === 'ASAAS') {
    if (!env.ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');
    const body = await requestJson(`${asaasBaseUrl()}/payments/${encodeURIComponent(resourceId)}`, { headers: { access_token: env.ASAAS_API_KEY, 'user-agent': 'sst-saas-platform/10.11' } });
    const rawStatus = String(body.status ?? '').trim();
    return { rawStatus, normalizedStatus: normalizePaymentStatus(rawStatus), body };
  }
  if (provider === 'MERCADO_PAGO') {
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
    const body = await requestJson(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}` } });
    const rawStatus = String(body.status ?? '').trim();
    return { rawStatus, normalizedStatus: normalizePaymentStatus(rawStatus), body };
  }
  throw new Error('Provedor sem consulta externa suportada');
}
