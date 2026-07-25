import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const shell = readFileSync('src/components/app-shell.tsx', 'utf8');
const createRoute = readFileSync('src/app/api/legacy-imports/route.ts', 'utf8');
const factRoute = readFileSync('src/app/api/legacy-imports/[id]/facts/[factId]/route.ts', 'utf8');
const commitRoute = readFileSync('src/app/api/legacy-imports/[id]/commit/route.ts', 'utf8');
const worker = readFileSync('src/worker/processors.ts', 'utf8');
const service = readFileSync('src/lib/legacy-imports.ts', 'utf8');
const ai = readFileSync('src/lib/integrations/ai.ts', 'utf8');

test('schema preserva lote, documento, fato, conflito e proveniência', () => {
  for (const model of ['LegacyImportBatch', 'LegacyImportDocument', 'LegacyExtractedFact', 'LegacyImportConflict']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  for (const field of ['sourcePage', 'sourceLocator', 'sourceExcerpt', 'confidence', 'normalizedValue', 'appliedEntityId']) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
  }
  assert.match(schema, /legacyImportBatchId String\?/);
});

test('importação fica atrás de feature flag e permissão', () => {
  assert.match(env, /FEATURE_LEGACY_IMPORTS/);
  assert.match(shell, /FEATURE_LEGACY_IMPORTS/);
  assert.match(createRoute, /authorizeTenantApi\('work\.manage'\)/);
  assert.match(factRoute, /authorizeTenantApi\('work\.manage'\)/);
  assert.match(commitRoute, /authorizeTenantApi\('work\.manage'\)/);
});

test('arquivos são preservados e processados pelo Worker', () => {
  assert.match(createRoute, /saveFile/);
  assert.match(createRoute, /LEGACY_ANALYZE_DOCUMENT/);
  assert.match(worker, /case 'LEGACY_ANALYZE_DOCUMENT'/);
  assert.match(service, /storage\.get/);
});

test('modo protegido exige confirmação de anonimização', () => {
  assert.match(createRoute, /documentsAnonymized/);
  assert.match(service, /settings\.dataPolicy === 'PROTECTED'/);
  assert.match(service, /documentsAnonymized !== true/);
});

test('aplicação é revisada, idempotente e não sobrescreve campos existentes', () => {
  assert.match(service, /status: 'APPROVED'/);
  assert.match(service, /batch\.status === 'COMPLETED'/);
  assert.match(service, /legacyImportBatchId: batch\.id/);
  assert.match(service, /if \(!company\.tradeName\)/);
  assert.match(service, /if \(!company\.cnpj/);
  assert.match(service, /existingArtifact/);
});

test('OpenAI e Gemini recebem arquivos pela interface comum', () => {
  assert.match(ai, /export type AIFileInput/);
  assert.match(ai, /type: 'input_file'/);
  assert.match(ai, /inlineData/);
  assert.match(ai, /strict: tool\.strict \?\? true/);
});
