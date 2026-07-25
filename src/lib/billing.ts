import type { BillingInterval, BillingUsageMetric, PaymentProvider } from '@prisma/client';
import { billingPeriod, invoiceTransition, planEntitlement, subscriptionState } from '@/domain/commercial/subscription';
import { db } from './db';
import { toPrismaJson } from './prisma-json';

export async function createSaasPlan(input: { code: string; name: string; description?: string | null; interval: BillingInterval; priceCents: number; trialDays?: number; limits?: Record<string, number | boolean | null>; features?: string[] }) {
  if (input.code.trim().length < 2 || input.name.trim().length < 3) throw new Error('Código e nome do plano são obrigatórios');
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw new Error('Preço inválido');
  return db.saasPlan.create({ data: { code: input.code.trim().toUpperCase(), name: input.name.trim(), description: input.description?.trim() || null, interval: input.interval, priceCents: input.priceCents, trialDays: Math.max(0, Math.round(input.trialDays ?? 0)), limits: toPrismaJson(input.limits ?? {}), features: toPrismaJson(input.features ?? []) } });
}

export async function startTenantSubscription(input: { tenantId: string; planId: string; provider?: PaymentProvider; startedAt?: Date; providerCustomerId?: string | null; providerSubscriptionId?: string | null }) {
  const [tenant, plan] = await Promise.all([db.tenant.findUnique({ where: { id: input.tenantId } }), db.saasPlan.findFirst({ where: { id: input.planId, active: true } })]);
  if (!tenant || !plan) throw new Error('Consultoria ou plano não encontrado');
  const startedAt = input.startedAt ?? new Date();
  const period = billingPeriod(startedAt, plan.interval);
  const trialEndsAt = plan.trialDays > 0 ? new Date(startedAt.getTime() + plan.trialDays * 86_400_000) : null;
  const status = trialEndsAt ? 'TRIAL' : 'ACTIVE';
  return db.tenantSubscription.create({ data: { tenantId: tenant.id, planId: plan.id, status, provider: input.provider ?? 'MANUAL', providerCustomerId: input.providerCustomerId?.trim() || null, providerSubscriptionId: input.providerSubscriptionId?.trim() || null, startedAt, trialEndsAt, currentPeriodStart: period.start, currentPeriodEnd: period.end } });
}

export async function createBillingInvoice(input: { tenantId: string; subscriptionId?: string | null; provider?: PaymentProvider; description: string; amountCents: number; dueAt: Date; providerInvoiceId?: string | null; checkoutUrl?: string | null; pixPayload?: string | null }) {
  const subscription = input.subscriptionId ? await db.tenantSubscription.findFirst({ where: { id: input.subscriptionId, tenantId: input.tenantId } }) : null;
  if (input.subscriptionId && !subscription) throw new Error('Assinatura não pertence à consultoria');
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) throw new Error('Valor da cobrança inválido');
  return db.billingInvoice.create({ data: { tenantId: input.tenantId, subscriptionId: subscription?.id ?? null, provider: input.provider ?? subscription?.provider ?? 'MANUAL', providerInvoiceId: input.providerInvoiceId?.trim() || null, status: 'OPEN', description: input.description.trim(), amountCents: input.amountCents, dueAt: input.dueAt, checkoutUrl: input.checkoutUrl?.trim() || null, pixPayload: input.pixPayload?.trim() || null } });
}

export async function transitionBillingInvoice(input: { tenantId: string; invoiceId: string; nextStatus: 'OPEN' | 'PAID' | 'VOID' | 'OVERDUE' | 'REFUNDED' }) {
  const invoice = await db.billingInvoice.findFirst({ where: { id: input.invoiceId, tenantId: input.tenantId } });
  if (!invoice) throw new Error('Fatura não encontrada');
  if (!invoiceTransition(invoice.status, input.nextStatus)) throw new Error(`Transição de fatura inválida: ${invoice.status} → ${input.nextStatus}`);
  return db.billingInvoice.update({ where: { id: invoice.id }, data: { status: input.nextStatus, paidAt: input.nextStatus === 'PAID' ? new Date() : invoice.paidAt, voidedAt: input.nextStatus === 'VOID' ? new Date() : invoice.voidedAt } });
}

export async function recordUsage(input: { tenantId: string; subscriptionId?: string | null; metric: BillingUsageMetric; quantity: bigint | number; periodStart: Date; periodEnd: Date; source: string; sourceId?: string | null; metadata?: Record<string, unknown> }) {
  const quantity = typeof input.quantity === 'bigint' ? input.quantity : BigInt(Math.max(0, Math.round(input.quantity)));
  return db.billingUsageRecord.upsert({ where: { tenantId_metric_periodStart_periodEnd_source_sourceId: { tenantId: input.tenantId, metric: input.metric, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source, sourceId: input.sourceId ?? '' } }, update: { quantity: { increment: quantity }, metadata: toPrismaJson(input.metadata ?? {}) }, create: { tenantId: input.tenantId, subscriptionId: input.subscriptionId ?? null, metric: input.metric, quantity, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source, sourceId: input.sourceId ?? '', metadata: toPrismaJson(input.metadata ?? {}) } });
}

export async function tenantBillingOverview(tenantId: string) {
  const subscription = await db.tenantSubscription.findFirst({ where: { tenantId, status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'] } }, orderBy: { createdAt: 'desc' } });
  const plan = subscription ? await db.saasPlan.findUnique({ where: { id: subscription.planId } }) : null;
  const invoices = await db.billingInvoice.findMany({ where: { tenantId }, orderBy: { dueAt: 'desc' }, take: 20 });
  const overdue = invoices.some((invoice) => ['OPEN', 'OVERDUE'].includes(invoice.status) && invoice.dueAt < new Date());
  const state = subscription ? subscriptionState({ status: subscription.status, trialEndsAt: subscription.trialEndsAt, currentPeriodEnd: subscription.currentPeriodEnd, invoiceOverdue: overdue }) : 'NONE';
  return { subscription, plan, invoices, state };
}

export function entitlementForPlan(limits: unknown, key: string, usage: number) {
  const source = limits && typeof limits === 'object' && !Array.isArray(limits) ? limits as Record<string, unknown> : {};
  const raw = source[key];
  return planEntitlement({ limit: typeof raw === 'number' || typeof raw === 'boolean' || raw == null ? raw : false, usage });
}

export async function registerPaymentWebhook(input: { tenantId?: string | null; provider: PaymentProvider; externalId: string; eventType: string; signatureValid: boolean; payload: Record<string, unknown> }) {
  return db.paymentWebhookEvent.upsert({ where: { provider_externalId: { provider: input.provider, externalId: input.externalId } }, update: {}, create: { tenantId: input.tenantId ?? null, provider: input.provider, externalId: input.externalId, eventType: input.eventType, signatureValid: input.signatureValid, payload: toPrismaJson(input.payload), status: input.signatureValid ? 'RECEIVED' : 'IGNORED' } });
}
