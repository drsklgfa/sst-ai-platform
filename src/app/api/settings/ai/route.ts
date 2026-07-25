import type { IntegrationProvider } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { encryptSecret, decryptSecret } from '@/lib/secrets';
import { toPrismaJson } from '@/lib/prisma-json';
import { normalizeProviderSettings } from '@/domain/ai/capabilities';
import { createAIProviderClient } from '@/lib/integrations/ai';

const validProviders = new Set(['OPENAI', 'GEMINI']);
const redirectWith = (params: Record<string, string>) => NextResponse.redirect(publicAppUrl(`/settings/ai?${new URLSearchParams(params)}`), 303);

export async function POST(request: Request) {
  if (!env.FEATURE_AI_SETTINGS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('settings.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const provider = String(form.get('provider') ?? '').toUpperCase();
  if (!validProviders.has(provider)) return new Response('Provedor inválido', { status: 400 });
  const typedProvider = provider as 'OPENAI' | 'GEMINI';
  const operation = String(form.get('operation') ?? 'save');
  const existing = await db.integrationConfig.findUnique({ where: { tenantId_provider: { tenantId: tenant.id, provider: typedProvider as IntegrationProvider } } });

  if (operation === 'disable') {
    if (existing) await db.integrationConfig.update({ where: { id: existing.id }, data: { enabled: false } });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'AI_PROVIDER_DISABLED', entityType: 'IntegrationConfig', entityId: existing?.id, before: existing ? { provider, enabled: existing.enabled } : null, after: { provider, enabled: false } });
    return redirectWith({ saved: '1' });
  }

  const apiKeyInput = String(form.get('apiKey') ?? '').trim();
  const settings = normalizeProviderSettings({
    enabled: form.get('enabled') === 'on',
    modelEconomy: String(form.get('modelEconomy') ?? '').trim(),
    modelAdvanced: String(form.get('modelAdvanced') ?? '').trim(),
    modelVision: String(form.get('modelVision') ?? '').trim(),
    dailyRequestLimit: Number(form.get('dailyRequestLimit')),
    monthlyBudgetCents: Number(form.get('monthlyBudgetCents')),
    dataPolicy: String(form.get('dataPolicy') ?? 'PROTECTED'),
    autonomy: String(form.get('autonomy') ?? 'ASSISTANT'),
    capabilities: {
      text: form.get('capText') === 'on',
      images: form.get('capImages') === 'on',
      pdf: form.get('capPdf') === 'on',
      tools: form.get('capTools') === 'on',
      structuredOutput: form.get('capStructured') === 'on',
      longContext: form.get('capLongContext') === 'on',
    },
  }, typedProvider);
  if (!settings.modelEconomy) return new Response('Modelo econômico obrigatório', { status: 400 });
  let apiKey = apiKeyInput;
  if (!apiKey && existing?.configEncrypted) apiKey = decryptSecret(existing.configEncrypted);
  if (!apiKey) return new Response('Chave da API obrigatória', { status: 400 });

  if (operation === 'test') {
    try {
      await createAIProviderClient({ provider: typedProvider, model: settings.modelEconomy, apiKey }).testConnection();
      return redirectWith({ test: 'ok', provider: typedProvider });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return redirectWith({ error: encodeURIComponent(message.slice(0, 280)), provider: typedProvider });
    }
  }

  const saved = await db.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId: tenant.id, provider: typedProvider as IntegrationProvider } },
    update: { enabled: settings.enabled, configEncrypted: apiKeyInput ? encryptSecret(apiKeyInput) : existing?.configEncrypted, settings: toPrismaJson(settings) },
    create: { tenantId: tenant.id, provider: typedProvider as IntegrationProvider, enabled: settings.enabled, configEncrypted: encryptSecret(apiKey), settings: toPrismaJson(settings) },
  });
  await audit({ tenantId: tenant.id, userId: user.id, action: 'AI_PROVIDER_CONFIGURED', entityType: 'IntegrationConfig', entityId: saved.id, before: existing ? { provider: existing.provider, enabled: existing.enabled, settings: existing.settings, hasSecret: Boolean(existing.configEncrypted) } : null, after: { provider: saved.provider, enabled: saved.enabled, settings: saved.settings, hasSecret: true } });
  return redirectWith({ saved: '1' });
}
