export type AICapabilities = {
  text: boolean;
  images: boolean;
  pdf: boolean;
  tools: boolean;
  structuredOutput: boolean;
  longContext: boolean;
};

export type AIProviderSettings = {
  provider: 'OPENAI' | 'GEMINI';
  enabled: boolean;
  modelEconomy: string;
  modelAdvanced: string;
  modelVision: string;
  dailyRequestLimit: number;
  monthlyBudgetCents: number;
  dataPolicy: 'PROTECTED' | 'PROFESSIONAL';
  autonomy: 'ASSISTANT' | 'COPILOT' | 'SUPERVISED_AUTONOMY';
  capabilities: AICapabilities;
};

export const defaultCapabilities = (): AICapabilities => ({
  text: true,
  images: false,
  pdf: false,
  tools: false,
  structuredOutput: false,
  longContext: false,
});

export function normalizeProviderSettings(value: unknown, provider: 'OPENAI' | 'GEMINI'): AIProviderSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const capabilitiesSource = source.capabilities && typeof source.capabilities === 'object' ? source.capabilities as Record<string, unknown> : {};
  const int = (key: string, fallback: number, max: number) => {
    const parsed = Number(source[key]);
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
  };
  const text = (key: string, fallback: string) => typeof source[key] === 'string' && String(source[key]).trim() ? String(source[key]).trim() : fallback;
  const autonomy = ['ASSISTANT', 'COPILOT', 'SUPERVISED_AUTONOMY'].includes(String(source.autonomy)) ? String(source.autonomy) as AIProviderSettings['autonomy'] : 'ASSISTANT';
  const dataPolicy = ['PROTECTED', 'PROFESSIONAL'].includes(String(source.dataPolicy)) ? String(source.dataPolicy) as AIProviderSettings['dataPolicy'] : 'PROTECTED';
  return {
    provider,
    enabled: source.enabled === true,
    modelEconomy: text('modelEconomy', ''),
    modelAdvanced: text('modelAdvanced', ''),
    modelVision: text('modelVision', ''),
    dailyRequestLimit: int('dailyRequestLimit', 100, 100_000),
    monthlyBudgetCents: int('monthlyBudgetCents', 0, 100_000_000),
    autonomy,
    dataPolicy,
    capabilities: {
      text: capabilitiesSource.text !== false,
      images: capabilitiesSource.images === true,
      pdf: capabilitiesSource.pdf === true,
      tools: capabilitiesSource.tools === true,
      structuredOutput: capabilitiesSource.structuredOutput === true,
      longContext: capabilitiesSource.longContext === true,
    },
  };
}
