import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditHygieneCompleteness } from '../src/domain/hygiene/audit.ts';
import { calculateHygieneMethod, calculateIbutg, calculateNoiseDoseSum, calculateTimeWeightedAverage, calculateVectorMagnitude, interpretHygieneResult } from '../src/domain/hygiene/calculations.ts';
import { hygieneMethod, hygieneMethodCatalog, methodsForCategory } from '../src/domain/hygiene/catalog.ts';
import { calibrationState, canUseInstrument, validateFieldCalibration } from '../src/domain/hygiene/instruments.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';
import { hasTenantPermission } from '../src/lib/rbac.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const lib = readFileSync('src/lib/hygiene.ts', 'utf8');
const page = readFileSync('src/app/(app)/hygiene/[id]/page.tsx', 'utf8');
const sections = readFileSync('src/domain/documents/default-sections.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const reviewRoute = readFileSync('src/app/api/hygiene/[id]/measurements/[measurementId]/review/route.ts', 'utf8');
const auditRoute = readFileSync('src/app/api/hygiene/[id]/audit/route.ts', 'utf8');
const calibrationRoute = readFileSync('src/app/api/hygiene/[id]/instruments/[instrumentId]/calibrations/route.ts', 'utf8');

test('schema cria programa, planos, medições, instrumentos, calibrações, eventos e auditoria', () => {
  for (const model of ['OccupationalHygieneProgram', 'HygieneSamplingPlan', 'HygieneMeasurement', 'MeasurementInstrument', 'InstrumentCalibration', 'InstrumentEvent', 'HygieneAuditRun']) assert.match(schema, new RegExp(`model ${model} \\{`));
  for (const name of ['HygieneAgentCategory', 'HygieneSamplingStrategy', 'HygieneMeasurementStatus', 'MeasurementInstrumentStatus', 'InstrumentCalibrationStatus', 'HygieneAuditStatus']) assert.match(schema, new RegExp(`enum ${name} \\{`));
  assert.match(schema, /model HygieneMeasurement \{[\s\S]*calculationMemory[\s\S]*rawData[\s\S]*fieldCalibrationBefore[\s\S]*fieldCalibrationAfter/);
});

test('workflow higiene versão 2 cobre reconhecimento, estratégia, metrologia, resultados e integração', () => {
  const workflow = workflowDefinitionFor('HIGIENE_OCUPACIONAL');
  assert.equal(workflow.version, 2);
  const codes = workflow.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['agent_objective', 'representative_groups', 'sampling_strategy', 'minimum_samples', 'methodology_version', 'equipment_calibration', 'field_calibration', 'instrument_history', 'raw_data', 'calculation_memory', 'limits_comparison', 'result_professional_review', 'exposure_integration', 'pgr_integration', 'ltcat_integration']) assert.ok(codes.includes(code));
});

test('catálogo inclui NHOs essenciais e não inventa motor para método qualitativo', () => {
  for (const code of ['NHO01', 'NHO06', 'NHO07', 'NHO08', 'NHO09', 'NHO10', 'NHO11']) assert.ok(hygieneMethod(code));
  assert.equal(hygieneMethod('NHO06')?.currentEdition, '3ª edição');
  assert.equal(hygieneMethod('NR09_BIOLOGICAL')?.engine, null);
  assert.ok(methodsForCategory('NOISE').some((item) => item.code === 'NHO01'));
  assert.ok(hygieneMethodCatalog.length >= 10);
});

test('motores determinísticos registram memória sem produzir conclusão profissional', () => {
  assert.equal(calculateIbutg({ wetBulbC: 25, globeC: 35 }).result, 28);
  assert.equal(calculateIbutg({ wetBulbC: 25, globeC: 35, dryBulbC: 30, solarLoad: true }).result, 27.5);
  assert.equal(calculateNoiseDoseSum([30, 40, 20]).result, 90);
  assert.equal(calculateTimeWeightedAverage([{ value: 10, minutes: 60 }, { value: 20, minutes: 60 }]).result, 15);
  assert.equal(calculateVectorMagnitude({ x: 3, y: 4, z: 0 }).result, 5);
  const result = calculateHygieneMethod('NHO01', { doses: [40, 30] });
  assert.equal(result.calculated, true); assert.equal(result.result, 70); assert.equal(result.reviewRequired, true);
});

test('método sem motor exige resultado manual no serviço e não cria valor automaticamente', () => {
  const result = calculateHygieneMethod('NR09_BIOLOGICAL', {});
  assert.equal(result.calculated, false); assert.equal(result.result, null); assert.equal(result.reviewRequired, true);
  assert.match(lib, /Resultado manual é obrigatório quando o método não possui motor determinístico/);
});

test('interpretação compara resultado com nível de ação e limite sem decidir enquadramento legal', () => {
  assert.equal(interpretHygieneResult({ result: 40, actionLevel: 50, toleranceLimit: 100 }), 'BELOW_ACTION_LEVEL');
  assert.equal(interpretHygieneResult({ result: 70, actionLevel: 50, toleranceLimit: 100 }), 'BETWEEN_ACTION_AND_LIMIT');
  assert.equal(interpretHygieneResult({ result: 101, actionLevel: 50, toleranceLimit: 100 }), 'ABOVE_LIMIT');
  assert.equal(interpretHygieneResult({ result: 10 }), 'INCONCLUSIVE');
});

test('calibração calcula validade e bloqueia instrumento inadequado', () => {
  const ref = new Date('2026-07-23T12:00:00Z');
  assert.equal(calibrationState({ calibratedAt: new Date('2026-01-01'), validUntil: new Date('2027-01-01') }, ref), 'VALID');
  assert.equal(calibrationState({ calibratedAt: new Date('2025-01-01'), validUntil: new Date('2026-07-01') }, ref), 'EXPIRED');
  assert.equal(calibrationState({ calibratedAt: new Date('2026-01-01'), validUntil: new Date('2026-08-01') }, ref), 'EXPIRING');
  assert.equal(canUseInstrument({ status: 'AVAILABLE', calibrationRequired: true, calibrationStatus: 'VALID' }).allowed, true);
  assert.equal(canUseInstrument({ status: 'BLOCKED', calibrationRequired: true, calibrationStatus: 'VALID' }).allowed, false);
  assert.equal(canUseInstrument({ status: 'AVAILABLE', calibrationRequired: true, calibrationStatus: 'EXPIRED' }).allowed, false);
});

test('calibração de campo compara leituras antes e após', () => {
  assert.equal(validateFieldCalibration({ before: 114, after: 114.2, tolerance: 0.5 }).valid, true);
  const invalid = validateFieldCalibration({ before: 114, after: 115, tolerance: 0.5 });
  assert.equal(invalid.valid, false); assert.ok(invalid.findings.length > 0);
  assert.equal(validateFieldCalibration({ before: null, after: null }).valid, false);
});

test('auditoria reprova lacunas essenciais e aprova programa completo', () => {
  const complete = { hasScope: true, hasResponsibleProfessional: true, samplingPlanCount: 1, plansWithoutStrategy: 0, plansWithoutMethod: 0, plansBelowMinimumSamples: 0, measurementCount: 1, measurementsWithoutInstrument: 0, measurementsWithInvalidCalibration: 0, measurementsWithoutRawData: 0, measurementsWithoutCalculationMemory: 0, measurementsWithoutLimits: 0, unreviewedMeasurements: 0, instrumentsBlockedOrExpired: 0, limitationsRegistered: true, workflowProgress: 100 };
  assert.equal(auditHygieneCompleteness(complete).status, 'PASSED');
  const failed = auditHygieneCompleteness({ ...complete, hasScope: false, hasResponsibleProfessional: false, samplingPlanCount: 0, measurementCount: 0, measurementsWithInvalidCalibration: 1, unreviewedMeasurements: 1 });
  assert.equal(failed.status, 'FAILED');
  for (const code of ['HO_SCOPE', 'HO_RESPONSIBLE', 'HO_SAMPLING_PLAN', 'HO_MEASUREMENTS', 'HO_CALIBRATION', 'HO_REVIEW']) assert.ok(failed.findings.some((item) => item.code === code));
});

test('RBAC separa gestão, revisão profissional e gestão de instrumentos', () => {
  assert.equal(hasTenantPermission('CONSULTANT', 'hygiene.manage'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'hygiene.review'), false);
  assert.equal(hasTenantPermission('RESPONSIBLE_TECH', 'hygiene.review'), true);
  assert.equal(hasTenantPermission('ASSISTANT', 'instrument.manage'), false);
  assert.equal(hasTenantPermission('REVIEWER', 'instrument.read'), true);
});

test('serviço preserva memória, calibração e bloqueia aprovação sem profissional', () => {
  assert.match(lib, /calculationMemory: toPrismaJson/);
  assert.match(lib, /canUseInstrument/);
  assert.match(lib, /calibrationState/);
  assert.match(lib, /approvedProfessional/);
  assert.match(lib, /Medição inválida não pode ser aprovada sem correção/);
  assert.match(lib, /exposureAgentId/);
});

test('rotas exigem permissões específicas para revisão, auditoria e calibração', () => {
  assert.match(reviewRoute, /authorizeTenantApi\('hygiene\.review'\)/);
  assert.match(auditRoute, /authorizeTenantApi\('hygiene\.manage'\)/);
  assert.match(calibrationRoute, /authorizeTenantApi\('instrument\.manage'\)/);
});

test('interface cobre estratégia, medição, instrumentos, calibrações e auditoria', () => {
  for (const text of ['Estratégia e plano de amostragem', 'Registrar medição ou amostra', 'Instrumentos e calibrações', 'Planos, medições e revisão profissional', 'Auditorias técnicas']) assert.match(page, new RegExp(text));
  assert.match(page, /Calibração de campo antes/); assert.match(page, /Nível de ação/); assert.match(page, /Limite aplicável/);
});

test('modelo documental possui reconhecimento, estratégia, instrumentos, dados, cálculo e integração', () => {
  for (const code of ['RECOGNITION', 'SAMPLING_STRATEGY', 'INSTRUMENTS', 'FIELD_DATA', 'CALCULATION_MEMORY', 'CRITERIA_COMPARISON', 'EXPOSURE_INTEGRATION', 'METROLOGY_HISTORY']) assert.match(sections, new RegExp(code));
});

test('copiloto recebe panorama e auditoria, sem ferramenta de aprovação ou fabricação de medição', () => {
  assert.match(aiCatalog, /get_hygiene_overview/); assert.match(aiCatalog, /run_hygiene_audit/);
  assert.match(aiTools, /getHygieneOverview/); assert.match(aiTools, /runHygieneAudit/);
  assert.doesNotMatch(aiCatalog, /approve_hygiene|fabricate_measurement|issue_hygiene_report|sign_hygiene/i);
});

test('módulos permanecem atrás de feature flags desativadas por padrão', () => {
  assert.match(env, /FEATURE_OCCUPATIONAL_HYGIENE: booleanFromString\.default\(false\)/);
  assert.match(env, /FEATURE_INSTRUMENT_MANAGEMENT: booleanFromString\.default\(false\)/);
});
