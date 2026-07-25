import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const baseEnvironment = {
  ...process.env,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sst_saas?schema=public',
  AUTH_SECRET: 'ci-secret-with-at-least-32-characters',
  FILE_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  AI_PROVIDER: 'disabled',
  EMAIL_PROVIDER: 'disabled',
};

function run(script: string, environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: environment,
    encoding: 'utf8',
  });
}

test('preflight aceita armazenamento local completo', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('preflight rejeita S3 incompleto', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: '',
    S3_REGION: '',
    S3_BUCKET: '',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Configuração S3 incompleta/);
});

test('preflight do seed aceita credenciais fortes', () => {
  const result = run('scripts/preflight-seed.mjs', {
    ...process.env,
    SEED_TENANT_NAME: 'Consultoria Teste',
    SEED_TENANT_SLUG: 'consultoria-teste',
    SEED_ADMIN_NAME: 'Administrador',
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: 'SenhaForte@123',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('preflight do seed rejeita senha curta', () => {
  const result = run('scripts/preflight-seed.mjs', {
    ...process.env,
    SEED_TENANT_NAME: 'Consultoria Teste',
    SEED_TENANT_SLUG: 'consultoria-teste',
    SEED_ADMIN_NAME: 'Administrador',
    SEED_ADMIN_EMAIL: 'admin@example.com',
    SEED_ADMIN_PASSWORD: 'curta',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /12 caracteres/);
});

test('preflight rejeita OpenAI sem chave no fallback por ambiente', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OPENAI_API_KEY/);
});

test('preflight de produção exige HTTPS, migrate e S3', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    APP_URL: 'http://sst.example.com',
    DEPLOY_ENVIRONMENT: 'production',
    DB_SCHEMA_MODE: 'push',
    STORAGE_DRIVER: 'local',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HTTPS|DB_SCHEMA_MODE|STORAGE_DRIVER/);
});

test('preflight rejeita Asaas sem token próprio de webhook', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
    PAYMENT_PROVIDER: 'asaas',
    ASAAS_API_KEY: 'asaas-key',
    ASAAS_WEBHOOK_TOKEN: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ASAAS_WEBHOOK_TOKEN/);
});

test('preflight rejeita Mercado Pago sem segredo de webhook', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
    PAYMENT_PROVIDER: 'mercado_pago',
    MERCADO_PAGO_ACCESS_TOKEN: 'access-token',
    MERCADO_PAGO_WEBHOOK_SECRET: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /MERCADO_PAGO_WEBHOOK_SECRET/);
});

test('preflight rejeita transporte eSocial sem PFX e endpoints', () => {
  const result = run('scripts/preflight.mjs', {
    ...baseEnvironment,
    STORAGE_DRIVER: 'local',
    ESOCIAL_TRANSPORT_MODE: 'external_signed_xml',
    ESOCIAL_PFX_BASE64: '',
    ESOCIAL_RESTRICTED_ENDPOINT: '',
    ESOCIAL_PRODUCTION_ENDPOINT: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Configuração eSocial incompleta/);
});

test('preflight de produção separa Web migrate de Worker none', () => {
  const common = {
    ...baseEnvironment,
    APP_URL: 'https://sst.example.com',
    DEPLOY_ENVIRONMENT: 'production',
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: 'https://storage.example.com',
    S3_REGION: 'auto',
    S3_BUCKET: 'sst',
    S3_ACCESS_KEY_ID: 'key',
    S3_SECRET_ACCESS_KEY: 'secret',
  };
  const workerOk = run('scripts/preflight.mjs', { ...common, SERVICE_ROLE: 'worker', DB_SCHEMA_MODE: 'none' });
  assert.equal(workerOk.status, 0, workerOk.stderr);
  const workerWrong = run('scripts/preflight.mjs', { ...common, SERVICE_ROLE: 'worker', DB_SCHEMA_MODE: 'migrate' });
  assert.notEqual(workerWrong.status, 0);
  assert.match(workerWrong.stderr, /Worker de produção/);
  const webOk = run('scripts/preflight.mjs', { ...common, SERVICE_ROLE: 'web', DB_SCHEMA_MODE: 'migrate' });
  assert.equal(webOk.status, 0, webOk.stderr);
});
