import { existsSync, readFileSync } from 'node:fs';

const required = ['DATABASE_URL', 'AUTH_SECRET', 'FILE_ENCRYPTION_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET deve ter ao menos 32 caracteres.');
}
if (!/^[0-9a-fA-F]{64}$/.test(process.env.FILE_ENCRYPTION_KEY)) {
  throw new Error('FILE_ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais.');
}

const storageDriver = process.env.STORAGE_DRIVER ?? 'local';
if (!['local', 's3'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER deve ser local ou s3.');
}
if (storageDriver === 's3') {
  const s3Required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const s3Missing = s3Required.filter((key) => !process.env[key]);
  if (s3Missing.length) throw new Error(`Configuração S3 incompleta: ${s3Missing.join(', ')}`);
}

if ((process.env.AI_PROVIDER ?? 'disabled') === 'openai' && !process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY é obrigatória quando AI_PROVIDER=openai.');
}
if ((process.env.AI_PROVIDER ?? 'disabled') === 'gemini' && !process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY é obrigatória quando AI_PROVIDER=gemini.');
}
if ((process.env.EMAIL_PROVIDER ?? 'disabled') === 'resend') {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('RESEND_API_KEY e EMAIL_FROM são obrigatórios quando EMAIL_PROVIDER=resend.');
  }
}


const deployEnvironment = process.env.DEPLOY_ENVIRONMENT ?? 'development';
const dbSchemaMode = process.env.DB_SCHEMA_MODE ?? 'push';
const serviceRole = process.env.SERVICE_ROLE ?? 'web';
if (!['development', 'staging', 'production'].includes(deployEnvironment)) throw new Error('DEPLOY_ENVIRONMENT inválido.');
if (!['none', 'push', 'bootstrap', 'migrate'].includes(dbSchemaMode)) throw new Error('DB_SCHEMA_MODE inválido.');
if (!['web', 'worker'].includes(serviceRole)) throw new Error('SERVICE_ROLE inválido.');
if (deployEnvironment === 'production') {
  if (!String(process.env.APP_URL ?? '').startsWith('https://')) throw new Error('APP_URL deve usar HTTPS em produção.');
  if (serviceRole === 'web' && dbSchemaMode !== 'migrate') throw new Error('DB_SCHEMA_MODE=migrate é obrigatório no Web de produção após adoção da baseline.');
  if (serviceRole === 'worker' && dbSchemaMode !== 'none') throw new Error('DB_SCHEMA_MODE=none é obrigatório no Worker de produção.');
  if (storageDriver !== 's3') throw new Error('STORAGE_DRIVER=s3 é obrigatório em produção comercial.');
}

const paymentProvider = process.env.PAYMENT_PROVIDER ?? 'disabled';
if (paymentProvider === 'asaas') {
  if (!process.env.ASAAS_API_KEY) throw new Error('ASAAS_API_KEY é obrigatória.');
  if (!process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_TOKEN.length < 32) throw new Error('ASAAS_WEBHOOK_TOKEN deve ter ao menos 32 caracteres.');
}
if (paymentProvider === 'mercado_pago') {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('MERCADO_PAGO_ACCESS_TOKEN é obrigatório.');
  if (!process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADO_PAGO_WEBHOOK_SECRET.length < 24) throw new Error('MERCADO_PAGO_WEBHOOK_SECRET deve ter ao menos 24 caracteres.');
}
if ((process.env.ESOCIAL_TRANSPORT_MODE ?? 'disabled') === 'external_signed_xml') {
  const esocialRequired = ['ESOCIAL_PFX_BASE64', 'ESOCIAL_RESTRICTED_ENDPOINT', 'ESOCIAL_PRODUCTION_ENDPOINT'];
  const esocialMissing = esocialRequired.filter((key) => !process.env[key]);
  if (esocialMissing.length) throw new Error(`Configuração eSocial incompleta: ${esocialMissing.join(', ')}`);
}

if (!existsSync('prisma/schema.prisma')) throw new Error('prisma/schema.prisma ausente.');
JSON.parse(readFileSync('package.json', 'utf8'));
console.log('Preflight concluído.');
