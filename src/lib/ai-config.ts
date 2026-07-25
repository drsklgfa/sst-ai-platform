import type { IntegrationProvider } from '@prisma/client';
import { normalizeProviderSettings, type AIProviderSettings } from '@/domain/ai/capabilities';
import { db } from './db';
import { decryptSecret } from './secrets';

export type LoadedAIConfiguration = {
  provider: 'OPENAI' | 'GEMINI';
  apiKey: string;
  settings: AIProviderSettings;
};

export async function loadTenantAIConfigurations(tenantId: string) {
  const rows = await db.integrationConfig.findMany({
    where: { tenantId, provider: { in: ['OPENAI', 'GEMINI'] as IntegrationProvider[] } },
    orderBy: { provider: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider as 'OPENAI' | 'GEMINI',
    enabled: row.enabled,
    hasSecret: Boolean(row.configEncrypted),
    settings: normalizeProviderSettings(row.settings, row.provider as 'OPENAI' | 'GEMINI'),
    updatedAt: row.updatedAt,
  }));
}

export async function loadActiveAIConfiguration(tenantId: string, preferred?: 'OPENAI' | 'GEMINI'): Promise<LoadedAIConfiguration | null> {
  const providers = preferred ? [preferred] : ['OPENAI', 'GEMINI'] as const;
  for (const provider of providers) {
    const row = await db.integrationConfig.findUnique({ where: { tenantId_provider: { tenantId, provider } } });
    if (!row?.enabled || !row.configEncrypted) continue;
    const settings = normalizeProviderSettings(row.settings, provider);
    const model = settings.modelEconomy || settings.modelAdvanced || settings.modelVision;
    if (!model) continue;
    return { provider, apiKey: decryptSecret(row.configEncrypted), settings };
  }
  return null;
}
