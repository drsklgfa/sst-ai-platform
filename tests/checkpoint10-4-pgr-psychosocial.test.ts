import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assessPgrRisk, actionPriorityForRisk, needsActionPlan } from '../src/domain/pgr/risk.ts';
import { protectPsychosocialDimensions, psychosocialSummary } from '../src/domain/pgr/psychosocial.ts';
import { auditPgrCompleteness } from '../src/domain/pgr/audit.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const pgrLib = readFileSync('src/lib/pgr.ts', 'utf8');
const pgrPage = readFileSync('src/app/(app)/pgr/[id]/page.tsx', 'utf8');
const riskRoute = readFileSync('src/app/api/pgr/[id]/risks/route.ts', 'utf8');
const psychosocialRoute = readFileSync('src/app/api/pgr/[id]/psychosocial/route.ts', 'utf8');
const auditRoute = readFileSync('src/app/api/pgr/[id]/audit/route.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');

const completeAudit = {
  hasScope: true,
  hasCriteria: true,
  hasResponsible: true,
  riskCount: 2,
  risksWithoutSource: 0,
  risksWithoutHarms: 0,
  risksWithoutGroups: 0,
  risksWithoutControls: 0,
  risksNeedingAction: 1,
  risksLinkedToAction: 1,
  participationCount: 1,
  psychosocialRequired: false,
  approvedPsychosocialCount: 0,
  workflowProgress: 100,
  overdueActionCount: 0,
  actionsMissingOwnerOrDeadline: 0,
};

test('schema cria núcleo GRO/PGR, participação, psicossocial e auditoria', () => {
  for (const model of ['PgrProgram', 'PgrRiskAssessment', 'PgrParticipationRecord', 'PsychosocialAssessment', 'PsychosocialFinding', 'PgrAuditRun']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /model PgrProgram \{[\s\S]*workProjectId\s+String\s+@unique/);
  assert.match(schema, /model PgrRiskAssessment \{[\s\S]*initialLevel[\s\S]*residualLevel/);
  assert.match(schema, /model PgrRiskAssessment \{[\s\S]*sourcePage[\s\S]*confidence/);
});

test('avaliação de risco usa matriz determinística e exige avaliação residual completa', () => {
  const result = assessPgrRisk({ code: 'pgr-01', category: 'PHYSICAL', hazard: 'Ruído contínuo', possibleHarms: ['Perda auditiva'], exposedGroups: ['Produção'], severity: 4, probability: 3, exposure: 2, residualSeverity: 2, residualProbability: 2, residualExposure: 1 });
  assert.equal(result.code, 'PGR-01');
  assert.equal(result.initialScore, 24);
  assert.equal(result.initialLevel, 'CRITICAL');
  assert.equal(result.residualScore, 4);
  assert.equal(result.residualLevel, 'LOW');
  assert.throws(() => assessPgrRisk({ code: 'X', category: 'PHYSICAL', hazard: 'Ruído', possibleHarms: ['Dano'], exposedGroups: ['GHE'], severity: 2, probability: 2, residualSeverity: 1 }), /avaliação residual/i);
});

test('plano de ação é priorizado para riscos moderados, altos e críticos', () => {
  assert.equal(needsActionPlan('LOW'), false);
  assert.equal(needsActionPlan('MODERATE'), true);
  assert.equal(actionPriorityForRisk('CRITICAL'), 'IMEDIATA');
  assert.equal(actionPriorityForRisk('HIGH'), 'ALTA');
});

test('proteção psicossocial oculta grupos pequenos e não expõe grupos no agregado mínimo', () => {
  const result = protectPsychosocialDimensions([
    { dimension: 'Demandas', score: 85, responseCount: 4, groups: ['Turno A'] },
    { dimension: 'Apoio', score: 70, responseCount: 7, groups: ['Turno B'] },
    { dimension: 'Autonomia', score: 25, responseCount: 12, groups: ['Produção'] },
  ], 5, 10);
  assert.equal(result[0].disclosure, 'WITHHELD');
  assert.equal(result[0].score, null);
  assert.deepEqual(result[0].groups, []);
  assert.equal(result[1].disclosure, 'AGGREGATED');
  assert.deepEqual(result[1].groups, []);
  assert.equal(result[2].disclosure, 'DETAILED');
  assert.deepEqual(result[2].groups, ['Produção']);
  assert.equal(psychosocialSummary(result).withheldDimensions, 1);
});

test('auditoria reprova inventário vazio e risco psicossocial sem avaliação aprovada', () => {
  const result = auditPgrCompleteness({ ...completeAudit, riskCount: 0, psychosocialRequired: true, risksNeedingAction: 0, risksLinkedToAction: 0 });
  assert.equal(result.status, 'FAILED');
  assert.ok(result.findings.some((item) => item.code === 'PGR_INVENTORY_EMPTY'));
  assert.ok(result.findings.some((item) => item.code === 'PGR_PSYCHOSOCIAL_MISSING'));
});

test('auditoria aprova programa completo e alerta ação sem responsável ou prazo', () => {
  assert.equal(auditPgrCompleteness(completeAudit).status, 'PASSED');
  const warned = auditPgrCompleteness({ ...completeAudit, actionsMissingOwnerOrDeadline: 1 });
  assert.equal(warned.status, 'PASSED_WITH_WARNINGS');
  assert.ok(warned.findings.some((item) => item.code === 'PGR_ACTION_RESPONSIBILITY'));
});

test('workflow PGR versão 2 contempla participação, psicossocial, revisão e histórico', () => {
  const workflow = workflowDefinitionFor('PGR');
  assert.equal(workflow.version, 2);
  for (const code of ['preliminary_hazard_survey', 'worker_participation', 'psychosocial_management', 'monitoring_review']) {
    assert.ok(workflow.steps.some((step) => step.code === code));
  }
  const requirements = workflow.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['worker_participation_records', 'psychosocial_privacy', 'history_retention']) assert.ok(requirements.includes(code));
});

test('operações PGR validam tenant, GHE, vistoria e rastreiam origem', () => {
  assert.match(pgrLib, /serviceType: 'PGR'/);
  assert.match(pgrLib, /GHE não pertence à empresa do PGR/);
  assert.match(pgrLib, /Vistoria não pertence à empresa do PGR/);
  assert.match(pgrLib, /sourceType[\s\S]*sourceId[\s\S]*sourcePage[\s\S]*confidence/);
  assert.match(pgrLib, /workflowArtifact\.upsert/);
});

test('consolidação psicossocial usa somente respostas submetidas e proteção de grupos', () => {
  assert.match(pgrLib, /status: 'SUBMITTED', includedInConsolidation: true/);
  assert.match(pgrLib, /protectPsychosocialDimensions/);
  assert.match(pgrLib, /não constitui diagnóstico individual/);
  assert.match(pgrLib, /minimumGroupSize/);
  assert.match(psychosocialRoute, /authorizeTenantApi\('response\.moderate'\)/);
});

test('rotas críticas exigem permissões e auditoria', () => {
  assert.match(riskRoute, /authorizeTenantApi\('work\.manage'\)/);
  assert.match(riskRoute, /PGR_RISK_SAVED/);
  assert.match(auditRoute, /authorizeTenantApi\('work\.manage'\)/);
  assert.match(auditRoute, /PGR_AUDIT_RUN/);
});

test('interface permite inventário, participação, psicossocial, ação e auditoria', () => {
  for (const text of ['Inventário de riscos ocupacionais', 'Participação dos trabalhadores', 'Fatores psicossociais relacionados ao trabalho', 'Gerar ações necessárias', 'Executar auditoria']) assert.match(pgrPage, new RegExp(text));
  assert.match(pgrPage, /FEATURE_PSYCHOSOCIAL_GRO/);
});

test('copiloto possui ferramentas fechadas para panorama e auditoria do PGR', () => {
  assert.match(aiCatalog, /name: 'get_pgr_overview'/);
  assert.match(aiCatalog, /name: 'run_pgr_audit'/);
  assert.match(aiTools, /case 'get_pgr_overview'/);
  assert.match(aiTools, /case 'run_pgr_audit'/);
  assert.match(aiTools, /serviceType !== 'PGR'/);
});

test('módulos PGR e psicossocial permanecem desativáveis por feature flags', () => {
  assert.match(env, /FEATURE_PGR_GRO/);
  assert.match(env, /FEATURE_PSYCHOSOCIAL_GRO/);
});
