import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}, z.boolean());

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url().default('http://localhost:3000'),
    AUTH_SECRET: z.string().min(32),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(14),
    DEPLOY_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
    DB_SCHEMA_MODE: z.enum(['none', 'push', 'bootstrap', 'migrate']).default('push'),
    RELEASE_VERSION: z.string().min(1).default('development'),
    SERVICE_ROLE: z.enum(['web', 'worker']).default('web'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_PATH: z.string().min(1).default('.data/storage'),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).default('auto'),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: booleanFromString.default(false),

    FILE_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'deve conter exatamente 64 caracteres hexadecimais'),
    WORKER_POLL_MS: z.coerce.number().int().min(250).max(60_000).default(2500),
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: z.string().optional(),
    FEATURE_V10_WORKS: booleanFromString.default(false),
    FEATURE_AI_SETTINGS: booleanFromString.default(false),
    FEATURE_LEGACY_IMPORTS: booleanFromString.default(false),
    FEATURE_AI_COPILOT: booleanFromString.default(false),
    FEATURE_V10_HOME: booleanFromString.default(false),
    FEATURE_FIELD_OPERATIONS: booleanFromString.default(false),
    FEATURE_MULTIMODAL_INPUT: booleanFromString.default(false),
    FEATURE_PGR_GRO: booleanFromString.default(false),
    FEATURE_PSYCHOSOCIAL_GRO: booleanFromString.default(false),
    FEATURE_PCMSO: booleanFromString.default(false),
    FEATURE_MEDICAL_AREA: booleanFromString.default(false),
    FEATURE_ESOCIAL_S2220: booleanFromString.default(false),
    FEATURE_EXPOSURE_CORE: booleanFromString.default(false),
    FEATURE_LTCAT_PPP: booleanFromString.default(false),
    FEATURE_INSALUBRIDADE: booleanFromString.default(false),
    FEATURE_PERICULOSIDADE: booleanFromString.default(false),
    FEATURE_ESOCIAL_S2240: booleanFromString.default(false),
    FEATURE_ERGONOMICS: booleanFromString.default(false),
    FEATURE_OCCUPATIONAL_HYGIENE: booleanFromString.default(false),
    FEATURE_INSTRUMENT_MANAGEMENT: booleanFromString.default(false),
    FEATURE_CORPORATE_UNIVERSITY: booleanFromString.default(false),
    FEATURE_TRAINING_ASSESSMENTS: booleanFromString.default(false),
    FEATURE_COMPETENCY_MATRIX: booleanFromString.default(false),
    FEATURE_TRAINING_CERTIFICATES: booleanFromString.default(false),
    FEATURE_OPERATIONAL_SST: booleanFromString.default(false),
    FEATURE_EPI_EPC: booleanFromString.default(false),
    FEATURE_INCIDENTS_CAT: booleanFromString.default(false),
    FEATURE_WORK_PERMITS: booleanFromString.default(false),
    FEATURE_MACHINES_NR12: booleanFromString.default(false),
    FEATURE_CHEMICALS: booleanFromString.default(false),
    FEATURE_EMERGENCY_CIPA: booleanFromString.default(false),
    FEATURE_CONTRACTORS: booleanFromString.default(false),
    FEATURE_CLIENT_PORTAL_PLUS: booleanFromString.default(false),
    FEATURE_ESOCIAL_TRANSMISSION: booleanFromString.default(false),
    FEATURE_BILLING: booleanFromString.default(false),

    PAYMENT_PROVIDER: z.enum(['disabled', 'manual', 'asaas', 'mercado_pago']).default('disabled'),
    PAYMENT_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    PAYMENT_HTTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(15_000),
    ASAAS_API_KEY: z.string().min(1).optional(),
    ASAAS_WEBHOOK_TOKEN: z.string().min(32).max(255).optional(),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
    MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(24).optional(),
    PAYMENT_WEBHOOK_SECRET: z.string().min(24).optional(),
    BILLING_CURRENCY: z.string().length(3).default('BRL'),

    ESOCIAL_TRANSPORT_MODE: z.enum(['disabled', 'external_signed_xml']).default('disabled'),
    ESOCIAL_HTTP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
    ESOCIAL_PFX_BASE64: z.string().min(1).optional(),
    ESOCIAL_PFX_PASSPHRASE: z.string().optional(),
    ESOCIAL_RESTRICTED_ENDPOINT: z.string().url().optional(),
    ESOCIAL_PRODUCTION_ENDPOINT: z.string().url().optional(),

    AI_PROVIDER: z.enum(['disabled', 'openai', 'gemini']).default('disabled'),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).default('gpt-5'),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),

    EMAIL_PROVIDER: z.enum(['disabled', 'resend']).default('disabled'),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
  })
  .superRefine((value, context) => {
    if (value.STORAGE_DRIVER === 's3') {
      for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} é obrigatório quando STORAGE_DRIVER=s3`,
          });
        }
      }
    }

    if (value.AI_PROVIDER === 'openai' && !value.OPENAI_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY é obrigatória quando AI_PROVIDER=openai',
      });
    }

    if (value.AI_PROVIDER === 'gemini' && !value.GEMINI_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY é obrigatória quando AI_PROVIDER=gemini',
      });
    }

    if (value.PAYMENT_PROVIDER === 'asaas' && !value.ASAAS_API_KEY) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['ASAAS_API_KEY'], message: 'ASAAS_API_KEY é obrigatória quando PAYMENT_PROVIDER=asaas' });
    }
    if (value.PAYMENT_PROVIDER === 'mercado_pago' && !value.MERCADO_PAGO_ACCESS_TOKEN) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['MERCADO_PAGO_ACCESS_TOKEN'], message: 'MERCADO_PAGO_ACCESS_TOKEN é obrigatório quando PAYMENT_PROVIDER=mercado_pago' });
    }
    if (value.PAYMENT_PROVIDER === 'asaas' && !value.ASAAS_WEBHOOK_TOKEN) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['ASAAS_WEBHOOK_TOKEN'], message: 'ASAAS_WEBHOOK_TOKEN é obrigatório quando PAYMENT_PROVIDER=asaas' });
    }
    if (value.PAYMENT_PROVIDER === 'mercado_pago' && !value.MERCADO_PAGO_WEBHOOK_SECRET) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['MERCADO_PAGO_WEBHOOK_SECRET'], message: 'MERCADO_PAGO_WEBHOOK_SECRET é obrigatório quando PAYMENT_PROVIDER=mercado_pago' });
    }
    if (value.ESOCIAL_TRANSPORT_MODE === 'external_signed_xml') {
      for (const key of ['ESOCIAL_PFX_BASE64', 'ESOCIAL_RESTRICTED_ENDPOINT', 'ESOCIAL_PRODUCTION_ENDPOINT'] as const) {
        if (!value[key]) context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} é obrigatório para transmissão externa assinada do eSocial` });
      }
    }

    if (value.EMAIL_PROVIDER === 'resend') {
      if (!value.RESEND_API_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY é obrigatória quando EMAIL_PROVIDER=resend',
        });
      }
      if (!value.EMAIL_FROM) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['EMAIL_FROM'],
          message: 'EMAIL_FROM é obrigatório quando EMAIL_PROVIDER=resend',
        });
      }
    }
  });

export const env = schema.parse(process.env);
