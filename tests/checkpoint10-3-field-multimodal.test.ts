import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { checklistProgress, fieldChecklistFor, updateChecklist } from '../src/domain/field/checklists.ts';
import { attachmentKindForMime } from '../src/domain/field/validation.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const shell = readFileSync('src/components/app-shell.tsx', 'utf8');
const dashboard = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
const fieldOperations = readFileSync('src/lib/field-operations.ts', 'utf8');
const captureRoute = readFileSync('src/app/api/field-visits/[id]/captures/route.ts', 'utf8');
const locationRoute = readFileSync('src/app/api/field-visits/[id]/location/route.ts', 'utf8');
const copilotRoute = readFileSync('src/app/api/copilot/threads/[id]/messages/route.ts', 'utf8');
const orchestrator = readFileSync('src/lib/ai-orchestrator.ts', 'utf8');
const processors = readFileSync('src/worker/processors.ts', 'utf8');
const fileRoute = readFileSync('src/app/api/files/local/route.ts', 'utf8');

test('schema cria visitas, capturas e anexos multimodais rastreáveis', () => {
  assert.match(schema, /enum FieldVisitStatus/);
  assert.match(schema, /model FieldVisit \{[\s\S]*tenantId[\s\S]*companyId[\s\S]*workProjectId[\s\S]*inspectionId/);
  assert.match(schema, /model FieldCapture \{[\s\S]*workflowStepId[\s\S]*sectorId[\s\S]*gheId[\s\S]*jobFunctionId[\s\S]*workstationId/);
  assert.match(schema, /model AIMessageAttachment \{[\s\S]*fileObjectId[\s\S]*status/);
});

test('checklist de campo adapta-se ao serviço e calcula progresso obrigatório', () => {
  const aet = fieldChecklistFor('AET');
  assert.ok(aet.some((item) => item.code === 'worker_height'));
  assert.ok(aet.some((item) => item.code === 'pauses'));
  const firstRequired = aet.find((item) => item.required)!;
  const updated = updateChecklist(aet, firstRequired.code, true);
  assert.ok(checklistProgress(updated) > 0);
  assert.equal(checklistProgress([]), 0);
});

test('tipos de anexo distinguem imagem, áudio, planilha e texto', () => {
  assert.equal(attachmentKindForMime('image/jpeg'), 'IMAGE');
  assert.equal(attachmentKindForMime('audio/webm'), 'AUDIO');
  assert.equal(attachmentKindForMime('text/csv'), 'SPREADSHEET');
  assert.equal(attachmentKindForMime('text/plain'), 'TEXT');
});

test('captura de campo valida tenant, contexto organizacional e tipos de arquivo', () => {
  assert.match(captureRoute, /authorizeTenantApi\('inspection\.manage'\)/);
  assert.match(captureRoute, /tenantId: tenant\.id/);
  assert.match(captureRoute, /validateFieldFile/);
  assert.match(captureRoute, /establishment: \{ companyId: visit\.companyId \}/);
  assert.match(captureRoute, /FIELD_ANALYZE_CAPTURE/);
});

test('análise multimodal não inventa medições ou conclusão legal', () => {
  assert.match(fieldOperations, /Não invente peso, distância, ângulo, duração, ruído, concentração, temperatura, diagnóstico ou conclusão legal/);
  assert.match(fieldOperations, /missingMeasurements/);
  assert.match(fieldOperations, /status: 'REVIEW'/);
  assert.match(fieldOperations, /FIELD_CAPTURE_ANALYZED/);
});

test('worker processa evidências em segundo plano e permite repetição controlada', () => {
  assert.match(processors, /case 'FIELD_ANALYZE_CAPTURE'/);
  assert.match(processors, /analyzeFieldCapture/);
  assert.match(captureRoute, /status: queued \? 'QUEUED' : 'READY'/);
});

test('copiloto recebe no máximo quatro arquivos e exige autorização de dados', () => {
  assert.match(copilotRoute, /validateCopilotFiles/);
  assert.match(copilotRoute, /dataAuthorized/);
  assert.match(orchestrator, /Confirme a autorização e a revisão de dados pessoais/);
  assert.match(orchestrator, /aIMessageAttachment\.create/);
  assert.match(orchestrator, /files: round === 0/);
});

test('arquivos de campo e do copiloto seguem autorização interna específica', () => {
  assert.match(fileRoute, /aIMessageAttachment\.findFirst/);
  assert.match(fileRoute, /fieldCapture\.findFirst/);
  assert.match(fileRoute, /hasTenantPermission\(membership\.role, 'work\.manage'/);
  assert.match(fileRoute, /hasTenantPermission\(membership\.role, 'inspection\.manage'/);
});

test('geolocalização é explícita, validada e auditada', () => {
  assert.match(locationRoute, /latitude < -90/);
  assert.match(locationRoute, /longitude < -180/);
  assert.match(locationRoute, /BROWSER_GEOLOCATION/);
  assert.match(locationRoute, /FIELD_VISIT_LOCATION_CAPTURED/);
});

test('novos módulos são ativados por feature flags e aparecem na experiência principal', () => {
  for (const flag of ['FEATURE_V10_HOME', 'FEATURE_FIELD_OPERATIONS', 'FEATURE_MULTIMODAL_INPUT']) assert.match(env, new RegExp(flag));
  assert.match(shell, /FEATURE_FIELD_OPERATIONS/);
  assert.match(dashboard, /O que deseja fazer hoje\?/);
  assert.match(dashboard, /Coletas em campo/);
});
