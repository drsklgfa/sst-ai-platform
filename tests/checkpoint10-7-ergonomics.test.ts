import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { recommendAepConclusion } from '../src/domain/ergonomics/aep.ts';
import { auditErgonomicsCompleteness } from '../src/domain/ergonomics/audit.ts';
import { calculateErgonomicMethod, validateMethodInputs } from '../src/domain/ergonomics/assessment.ts';
import { ergonomicMethod, ergonomicMethodCatalog, ergonomicOrganizationFields } from '../src/domain/ergonomics/catalog.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';
import { hasTenantPermission } from '../src/lib/rbac.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const lib = readFileSync('src/lib/ergonomics.ts', 'utf8');
const page = readFileSync('src/app/(app)/ergonomics/[id]/page.tsx', 'utf8');
const sections = readFileSync('src/domain/documents/default-sections.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const decisionRoute = readFileSync('src/app/api/ergonomics/[id]/aep-decision/route.ts', 'utf8');
const reviewRoute = readFileSync('src/app/api/ergonomics/[id]/assessments/[assessmentId]/review/route.ts', 'utf8');
const auditRoute = readFileSync('src/app/api/ergonomics/[id]/audit/route.ts', 'utf8');

test('schema cria programa, demanda, situação, participação, métodos, achados, decisão e auditoria', () => {
  for (const model of ['ErgonomicsProgram', 'ErgonomicDemand', 'ErgonomicWorkSituation', 'ErgonomicParticipation', 'ErgonomicAssessment', 'ErgonomicFinding', 'ErgonomicPreliminaryDecision', 'ErgonomicsAuditRun']) assert.match(schema, new RegExp(`model ${model} \\{`));
  for (const enumName of ['ErgonomicsProgramStatus', 'ErgonomicAssessmentStage', 'ErgonomicMethodType', 'AepConclusion', 'ErgonomicsAuditStatus']) assert.match(schema, new RegExp(`enum ${enumName} \\{`));
  assert.match(schema, /model ErgonomicWorkSituation \{[\s\S]*prescribedWork[\s\S]*actualWork[\s\S]*variability[\s\S]*strategies[\s\S]*workOrganization[\s\S]*cognitiveDemands[\s\S]*psychosocialFactors/);
});

test('workflow AET versão 2 cobre AEP, atividade real, participação, dimensões, métodos, diagnóstico e ação', () => {
  const workflow = workflowDefinitionFor('AET');
  assert.equal(workflow.version, 2);
  const codes = workflow.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['demand', 'aep_decision', 'work_situations', 'prescribed_real_work', 'variability_strategies', 'worker_participation_records', 'work_organization', 'physical_demands', 'cognitive', 'psychosocial', 'method_selection', 'deterministic_calculations', 'technical_diagnosis', 'risk_integration']) assert.ok(codes.includes(code));
});

test('catálogo separa motores calculáveis de métodos em revisão técnica', () => {
  assert.ok(ergonomicMethodCatalog.length >= 10);
  for (const code of ['RULA', 'REBA', 'NIOSH']) assert.equal(ergonomicMethod(code)?.engineAvailable, true);
  for (const code of ['OCRA_CHECKLIST', 'ROSA', 'QEC', 'SNOOK_CIRIELLO']) assert.equal(ergonomicMethod(code)?.engineAvailable, false);
  assert.ok(ergonomicOrganizationFields.includes('ritmo de trabalho'));
});

test('RULA, REBA e NIOSH usam motores determinísticos existentes', () => {
  const rula = calculateErgonomicMethod('RULA', { upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1 });
  assert.equal(rula.calculated, true); assert.equal(rula.engineVersion, 'rula-v1'); assert.equal(typeof rula.score, 'number');
  const reba = calculateErgonomicMethod('REBA', { trunk: 1, neck: 1, legs: 1, upperArm: 1, lowerArm: 1, wrist: 1, load: 0, coupling: 0, activity: 0 });
  assert.equal(reba.engineVersion, 'reba-v1');
  const niosh = calculateErgonomicMethod('NIOSH', { loadKg: 10, horizontalCm: 25, originHeightCm: 75, verticalTravelCm: 25, asymmetryDeg: 0, frequencyMultiplier: 1, couplingMultiplier: 1 });
  assert.equal(niosh.engineVersion, 'niosh-v1'); assert.ok((niosh.score ?? 0) > 0);
});

test('método sem motor não inventa pontuação', () => {
  const result = calculateErgonomicMethod('OCRA_CHECKLIST', { qualquer: 1 });
  assert.equal(result.calculated, false); assert.equal(result.score, null); assert.equal(result.classification, null); assert.equal(result.reviewRequired, true);
  assert.deepEqual(validateMethodInputs('RULA', { upperArm: 1 }), ['Campo obrigatório ausente: lowerArm.', 'Campo obrigatório ausente: wrist.', 'Campo obrigatório ausente: wristTwist.', 'Campo obrigatório ausente: neck.', 'Campo obrigatório ausente: trunk.', 'Campo obrigatório ausente: legs.']);
});

test('recomendação da AEP exige AET quando há risco relevante, mudança ou insuficiência', () => {
  assert.equal(recommendAepConclusion({ findingCount: 1, highOrCriticalFindings: 1, unresolvedWorkerComplaints: 0, insufficientInformation: false, recurringHealthSignals: false, processChange: false, legalOrTechnicalNeed: false }).conclusion, 'AET_REQUIRED');
  assert.equal(recommendAepConclusion({ findingCount: 1, highOrCriticalFindings: 0, unresolvedWorkerComplaints: 0, insufficientInformation: false, recurringHealthSignals: false, processChange: false, legalOrTechnicalNeed: false }).conclusion, 'IMPROVEMENT_ACTIONS');
  assert.equal(recommendAepConclusion({ findingCount: 0, highOrCriticalFindings: 0, unresolvedWorkerComplaints: 0, insufficientInformation: false, recurringHealthSignals: false, processChange: false, legalOrTechnicalNeed: false }).conclusion, 'NO_FURTHER_ACTION');
});

test('auditoria reprova lacunas essenciais e aprova base completa', () => {
  const complete = { hasScope: true, hasResponsible: true, demandCount: 1, workSituationCount: 1, situationsWithoutPrescribedOrActual: 0, participationCount: 1, assessmentCount: 1, calculatedAssessmentCount: 1, unreviewedAssessmentCount: 0, findingCount: 1, highOrCriticalFindingCount: 0, findingsWithoutRecommendation: 0, findingsWithoutAction: 0, hasAepDecision: true, aepRequiresAet: false, aetStageEnabled: false, limitationsRegistered: true, workflowProgress: 100 };
  assert.equal(auditErgonomicsCompleteness(complete).status, 'PASSED');
  const failed = auditErgonomicsCompleteness({ ...complete, hasScope: false, demandCount: 0, workSituationCount: 0, hasAepDecision: false, findingsWithoutRecommendation: 1 });
  assert.equal(failed.status, 'FAILED');
  for (const code of ['ERG_SCOPE', 'ERG_DEMAND', 'ERG_WORK_SITUATION', 'ERG_RECOMMENDATION', 'ERG_AEP_DECISION']) assert.ok(failed.findings.some((item) => item.code === code));
});

test('RBAC separa leitura, gestão e aprovação ergonômica', () => {
  assert.equal(hasTenantPermission('CONSULTANT', 'ergonomics.manage'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'ergonomics.conclusion.approve'), false);
  assert.equal(hasTenantPermission('REVIEWER', 'ergonomics.read'), true);
  assert.equal(hasTenantPermission('RESPONSIBLE_TECH', 'ergonomics.conclusion.approve'), true);
});

test('serviço integra achados ao risco canônico e impede decisão aprovada sem responsável', () => {
  assert.match(lib, /db\.risk\.upsert/);
  assert.match(lib, /category: 'ERGONOMIC'/);
  assert.match(lib, /calculateErgonomicMethod/);
  assert.match(lib, /status === 'APPROVED' && !input\.userId/);
  assert.match(lib, /generateErgonomicActionPlan/);
});

test('rotas reservam decisões e revisão ao responsável técnico', () => {
  assert.match(decisionRoute, /authorizeTenantApi\('ergonomics\.conclusion\.approve'\)/);
  assert.match(reviewRoute, /authorizeTenantApi\('ergonomics\.conclusion\.approve'\)/);
  assert.match(auditRoute, /authorizeTenantApi\('ergonomics\.manage'\)/);
});

test('interface cobre demanda, trabalho real, participação, métodos, diagnóstico, decisão e auditoria', () => {
  for (const text of ['Demanda ergonômica', 'Situações de trabalho e análise da atividade', 'Participação dos trabalhadores', 'Métodos ergonômicos', 'Achados e diagnóstico', 'Decisão da AEP', 'Auditorias técnicas']) assert.match(page, new RegExp(text));
  assert.match(page, /Trabalho prescrito/); assert.match(page, /Trabalho real/); assert.match(page, /RULA, REBA e NIOSH/);
});

test('modelo documental AET possui estrutura técnica completa', () => {
  for (const code of ['DEMAND', 'WORK_SITUATIONS', 'ACTIVITY_ANALYSIS', 'WORKER_PARTICIPATION', 'WORK_ORGANIZATION', 'ERGONOMIC_DIMENSIONS', 'ERGONOMIC_TOOLS', 'ERGONOMIC_DIAGNOSIS', 'AEP_DECISION']) assert.match(sections, new RegExp(code));
});

test('copiloto recebe panorama e auditoria sem ferramenta de aprovação técnica', () => {
  assert.match(aiCatalog, /get_ergonomics_overview/); assert.match(aiCatalog, /run_ergonomics_audit/);
  assert.match(aiTools, /getErgonomicsOverview/); assert.match(aiTools, /runErgonomicsAudit/);
  assert.doesNotMatch(aiCatalog, /approve_aep|approve_aet|issue_aet|sign_aet/i);
});

test('módulo permanece atrás de feature flag desativada por padrão', () => {
  assert.match(env, /FEATURE_ERGONOMICS: booleanFromString\.default\(false\)/);
});
