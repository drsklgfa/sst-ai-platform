import { existsSync, readFileSync } from 'node:fs';

const errors = [];
const warnings = [];
const requiredFiles = [
  'prisma/schema.prisma',
  'prisma/migrations/migration_lock.toml',
  'prisma/migrations/20260723000000_existing_schema_baseline/migration.sql',
  '.github/workflows/ci.yml',
  'docker/entrypoint.sh',
  'docs/V10_11_DEPLOYMENT.md',
];
for (const file of requiredFiles) if (!existsSync(file)) errors.push(`Arquivo obrigatório ausente: ${file}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!String(pkg.version).includes('checkpoint.10.11')) errors.push('package.json não está versionado como Checkpoint 10.11');
if (!existsSync('package-lock.json')) warnings.push('package-lock.json ainda precisa ser gerado pelo primeiro npm install com acesso ao registry e commitado antes do go-live.');

const env = process.env;
const deploy = env.DEPLOY_ENVIRONMENT ?? 'development';
const schemaMode = env.DB_SCHEMA_MODE ?? 'push';
if (deploy === 'production') {
  if (!String(env.APP_URL ?? '').startsWith('https://')) errors.push('APP_URL deve usar HTTPS em produção');
  if (schemaMode !== 'migrate') errors.push('DB_SCHEMA_MODE deve ser migrate em produção após a adoção da baseline');
  if ((env.STORAGE_DRIVER ?? 'local') !== 's3') errors.push('STORAGE_DRIVER deve ser s3 em produção');
  if ((env.EMAIL_PROVIDER ?? 'disabled') === 'disabled') warnings.push('E-mail está desativado; convites, alertas e recuperação operacional ficarão limitados.');
}
if ((env.FEATURE_BILLING ?? 'false') === 'true' && ['disabled', 'manual'].includes(env.PAYMENT_PROVIDER ?? 'disabled')) warnings.push('Cobrança externa não está ativa; o faturamento continuará manual.');
if ((env.FEATURE_ESOCIAL_TRANSMISSION ?? 'false') === 'true' && (env.ESOCIAL_TRANSPORT_MODE ?? 'disabled') !== 'external_signed_xml') errors.push('Transmissão eSocial habilitada sem transporte external_signed_xml');

const result = { ok: errors.length === 0, errors, warnings, version: pkg.version, deployEnvironment: deploy, dbSchemaMode: schemaMode };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
