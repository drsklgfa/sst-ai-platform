import { env } from '@/lib/env';
import { authorizeTenantApi } from '@/lib/auth';
import { createExternalInvoiceCheckout } from '@/lib/integrations/payments';
import { audit } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_BILLING || !['asaas', 'mercado_pago'].includes(env.PAYMENT_PROVIDER)) return new Response('Gateway externo desativado', { status: 404 });
  const auth = await authorizeTenantApi('billing.manage');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* corpo opcional */ }
  try {
    const result = await createExternalInvoiceCheckout({ tenantId: auth.tenant.id, invoiceId: id, payerEmail: String(body.payerEmail ?? '').trim() || null });
    await audit({ tenantId: auth.tenant.id, userId: auth.user.id, action: 'BILLING_CHECKOUT_CREATED', entityType: 'BillingInvoice', entityId: result.invoice.id, after: result.invoice });
    return Response.json({ invoiceId: result.invoice.id, checkoutUrl: result.invoice.checkoutUrl, pixPayload: result.invoice.pixPayload });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao criar checkout', { status: 400 });
  }
}
