import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditExposureCompleteness } from '../src/domain/exposures/audit.ts';
import { nr15Annex, nr15AnnexCatalog, nr16Activity, nr16ActivityCatalog } from '../src/domain/exposures/catalog.ts';
import { assessProtection } from '../src/domain/exposures/effectiveness.ts';
import { buildS2240Payload, validateS2240Input } from '../src/domain/exposures/esocial-s2240.ts';
import { buildPppSnapshot, validatePppInput } from '../src/domain/exposures/ppp.ts';
import { dateRangeDays, exposurePeriodsOverlap, normalizeExposurePattern, validateExposurePeriod } from '../src/domain/exposures/periods.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';
import { hasTenantPermission } from '../src/lib/rbac.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const exposureLib = readFileSync('src/lib/exposures.ts', 'utf8');
const exposurePage = readFileSync('src/app/(app)/exposures/[id]/page.tsx', 'utf8');
const ltcatRoute = readFileSync('src/app/api/exposures/[id]/ltcat-conclusions/route.ts', 'utf8');
const insalubrityRoute = readFileSync('src/app/api/exposures/[id]/insalubrity/route.ts', 'utf8');
const periculosidadeRoute = readFileSync('src/app/api/exposures/[id]/periculosidade/route.ts', 'utf8');
const pppRoute = readFileSync('src/app/api/exposures/[id]/ppp/[workerId]/route.ts', 'utf8');
const s2240Route = readFileSync('src/app/api/exposures/[id]/esocial/[periodId]/route.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const sections = readFileSync('src/domain/documents/default-sections.ts', 'utf8');

const validS2240Input = {
  employerRegistration: '12345678000195',
  workerCpf: '529.982.247-25',
  workerRegistration: 'MAT-001',
  startsAt: new Date('2026-01-01T12:00:00.000Z'),
  environment: { code: 'AMB-001', description: 'Produção' },
  activities: ['Operar máquina e acompanhar processo'],
  agents: [{
    code: '02.01.001',
    description: 'Ruído',
    assessmentType: 'QUANTITATIVE' as const,
    intensity: 87.4,
    unit: 'dB(A)',
    toleranceLimit: 85,
    measurementTechnique: 'NHO 01',
    epcUsed: true,
    epcEffective: false,
    epiUsed: true,
    epiEffective: true,
    epis: [{ ca: '12345', description: 'Protetor auditivo', protectionMeasures: true, operatingCondition: true, continuousUse: true, validityObserved: true, replacementObserved: true, hygieneObserved: true }],
  }],
  responsible: { name: 'Eng. Responsável', cpf: '52998224725', councilType: 'CREA', councilNumber: '123456', councilState: 'SP' },
  processVersion: 'sst-saas-10.6',
};

const pppInput = {
  employer: { legalName: 'Empresa X Ltda.', cnpj: '12.345.678/0001-95' },
  worker: { fullName: 'Trabalhador Teste', cpfMasked: '***.982.247-**', registration: 'MAT-001', admissionDate: new Date('2024-01-02T12:00:00.000Z') },
  periods: [
    { id: 'p2', startsAt: new Date('2025-01-01T12:00:00.000Z'), establishment: 'Matriz', sector: 'Produção', jobFunction: 'Operador', activities: ['Operar máquina'], agents: [], responsible: null },
    { id: 'p1', startsAt: new Date('2024-01-02T12:00:00.000Z'), endsAt: new Date('2024-12-31T12:00:00.000Z'), establishment: 'Matriz', sector: 'Montagem', jobFunction: 'Auxiliar', activities: ['Montar peças'], agents: [{ code: '02.01.001', name: 'Ruído', intensity: 84, unit: 'dB(A)', technique: 'NHO 01', epcEffective: false, epiEffective: true }], responsible: { name: 'Eng. Responsável', council: 'CREA 123456' } },
  ],
};

const completeAudit = {
  hasScope: true,
  hasResponsibleProfessional: true,
  periodCount: 2,
  openPeriodCount: 1,
  periodsWithoutStructure: 0,
  agentCount: 2,
  agentsWithoutLegalBasis: 0,
  quantitativeAgentsWithoutMeasurement: 0,
  measurementsWithoutCalibration: 0,
  controlsWithoutEffectiveness: 0,
  pendingTechnicalConclusions: 0,
  pppInvalidCount: 0,
  s2240InvalidCount: 0,
  workflowProgress: 100,
};

test('schema cria fonte única de exposições, conclusões, PPP, S-2240 e auditoria', () => {
  for (const model of ['OccupationalTechnicalProfessional', 'OccupationalExposureProgram', 'OccupationalExposurePeriod', 'OccupationalExposureAgent', 'OccupationalExposureMeasurement', 'OccupationalExposureControl', 'LtcatTechnicalConclusion', 'InsalubrityAssessment', 'DangerousConditionAssessment', 'PppDraft', 'EsocialS2240Draft', 'ExposureAuditRun']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /model OccupationalExposurePeriod \{[\s\S]*startsAt[\s\S]*endsAt[\s\S]*workerId[\s\S]*gheId/);
  assert.match(schema, /model OccupationalExposureAgent \{[\s\S]*esocialCode[\s\S]*specialRetirementYears/);
});

test('RBAC separa gestão de exposições, preparação e aprovação técnica', () => {
  assert.equal(hasTenantPermission('CONSULTANT', 'exposure.manage'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'ppp.prepare'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'esocial.s2240.prepare'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'technical.conclusion.approve'), false);
  assert.equal(hasTenantPermission('REVIEWER', 'exposure.read'), true);
  assert.equal(hasTenantPermission('RESPONSIBLE_TECH', 'technical.conclusion.approve'), true);
});

test('períodos históricos validam datas, duração, padrão e sobreposição', () => {
  assert.deepEqual(validateExposurePeriod({ startsAt: new Date('2024-01-01'), endsAt: new Date('2024-01-31') }, new Date('2026-01-01')), []);
  assert.ok(validateExposurePeriod({ startsAt: new Date('2024-02-01'), endsAt: new Date('2024-01-31') }, new Date('2026-01-01')).length > 0);
  assert.equal(dateRangeDays({ startsAt: new Date('2024-01-01'), endsAt: new Date('2024-01-31') }), 31);
  assert.equal(exposurePeriodsOverlap({ startsAt: new Date('2024-01-01'), endsAt: new Date('2024-03-31') }, { startsAt: new Date('2024-03-31'), endsAt: new Date('2024-05-01') }), true);
  assert.equal(exposurePeriodsOverlap({ startsAt: new Date('2024-01-01'), endsAt: new Date('2024-03-30') }, { startsAt: new Date('2024-03-31') }), false);
  assert.equal(normalizeExposurePattern('intermittent'), 'INTERMITTENT');
  assert.equal(normalizeExposurePattern('qualquer'), 'UNKNOWN');
});

test('eficácia de EPC/EPI exige evidência mínima e não presume neutralização', () => {
  const invalid = assessProtection([{ type: 'EPI', effectiveness: 'EFFECTIVE', ca: null, continuousUse: false, trainingRecorded: false }]);
  assert.equal(invalid.epiEffective, false);
  assert.equal(invalid.canClaimNeutralization, false);
  assert.ok(invalid.findings.length >= 3);
  const valid = assessProtection([{ type: 'EPI', effectiveness: 'EFFECTIVE', ca: '12345', continuousUse: true, trainingRecorded: true }]);
  assert.equal(valid.epiEffective, true);
  assert.equal(valid.canClaimNeutralization, true);
  const expired = assessProtection([{ type: 'EPC', effectiveness: 'EFFECTIVE', maintenanceRecorded: true, validUntil: new Date('2025-01-01') }], new Date('2026-01-01'));
  assert.equal(expired.epcUsed, false);
});

test('catálogos reconhecem anexos NR-15 e categorias NR-16 sem inventar enquadramento', () => {
  assert.ok(nr15AnnexCatalog.length >= 13);
  assert.equal(nr15Annex('13a')?.title, 'Benzeno');
  assert.equal(nr15Annex('99'), null);
  assert.ok(nr16ActivityCatalog.some((item) => item.code === 'ELECTRICITY'));
  assert.equal(nr16Activity('flammables')?.title, 'Inflamáveis');
  assert.equal(nr16Activity('invalid'), null);
});

test('S-2240 gera rascunho S-1.3 com ambiente, atividades, agentes, controles e responsável', () => {
  const payload = buildS2240Payload(validS2240Input);
  assert.equal(payload.version, 'S-1.3');
  assert.equal(payload.event, 'S-2240');
  assert.deepEqual(payload.evtExpRisco.ideEmpregador, { tpInsc: '1', nrInsc: '12345678' });
  assert.equal(payload.evtExpRisco.infoExpRisco.infoAmb[0].codAmb, 'AMB-001');
  assert.equal(payload.evtExpRisco.infoExpRisco.agNoc[0].tpAval, '1');
  assert.equal(payload.evtExpRisco.infoExpRisco.agNoc[0].epcEpi.eficEpi, 'S');
  assert.deepEqual(validateS2240Input(validS2240Input), []);
});

test('validação S-2240 bloqueia vínculo, ambiente, atividade, agente quantitativo e responsável incompletos', () => {
  const findings = validateS2240Input({
    ...validS2240Input,
    employerRegistration: '1',
    workerCpf: '11111111111',
    workerRegistration: null,
    workerCategoryCode: null,
    environment: { code: '', description: '' },
    activities: [''],
    agents: [{ ...validS2240Input.agents[0], code: '', intensity: null, epiEffective: true, epis: [] }],
    responsible: { ...validS2240Input.responsible, cpf: '1', councilNumber: '' },
  });
  for (const code of ['EMPLOYER_REGISTRATION', 'WORKER_CPF', 'WORKER_LINK', 'ENVIRONMENT', 'ACTIVITIES', 'AGENT_1_CODE', 'AGENT_1_RESULT', 'RESPONSIBLE_CPF', 'RESPONSIBLE_COUNCIL']) assert.ok(findings.some((item) => item.code === code));
});

test('PPP preserva histórico em ordem temporal e alerta sobre períodos sobrepostos', () => {
  const snapshot = buildPppSnapshot(pppInput);
  assert.equal(snapshot.version, 'PPP_ELETRONICO_V1');
  assert.equal(snapshot.occupationalHistory[0].id, 'p1');
  assert.equal(snapshot.occupationalHistory[1].id, 'p2');
  assert.deepEqual(validatePppInput(pppInput), []);
  const overlap = validatePppInput({ ...pppInput, periods: [{ ...pppInput.periods[1], endsAt: new Date('2025-03-01') }, pppInput.periods[0]] });
  assert.ok(overlap.some((item) => item.code === 'PPP_PERIOD_OVERLAP'));
});

test('auditoria reprova ausência de estrutura, medição e conclusões e aprova base completa', () => {
  assert.equal(auditExposureCompleteness(completeAudit).status, 'PASSED');
  const failed = auditExposureCompleteness({ ...completeAudit, hasResponsibleProfessional: false, periodsWithoutStructure: 1, quantitativeAgentsWithoutMeasurement: 2, pendingTechnicalConclusions: 1, workflowProgress: 60 });
  assert.equal(failed.status, 'FAILED');
  for (const code of ['EXPOSURE_RESPONSIBLE', 'EXPOSURE_PERIOD_STRUCTURE', 'EXPOSURE_MEASUREMENT_MISSING', 'EXPOSURE_CONCLUSIONS']) assert.ok(failed.findings.some((item) => item.code === code));
});

test('workflows LTCAT, insalubridade e periculosidade estão na versão 2 e cobrem os requisitos críticos', () => {
  const ltcat = workflowDefinitionFor('LTCAT');
  const li = workflowDefinitionFor('INSALUBRIDADE');
  const lp = workflowDefinitionFor('PERICULOSIDADE');
  assert.equal(ltcat.version, 2);
  assert.equal(li.version, 2);
  assert.equal(lp.version, 2);
  const ltcatReqs = ltcat.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['assignment_history', 'exposure_periods', 'harmful_agents', 'calibration', 'epc_epi', 'conclusion_by_ghe', 'ppp_esocial_data', 'transmission_approval']) assert.ok(ltcatReqs.includes(code));
  const liReqs = li.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['applicable_annexes', 'qualitative_quantitative', 'controls', 'conclusion_by_function', 'professional_approval']) assert.ok(liReqs.includes(code));
  const lpReqs = lp.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['applicable_activity', 'risk_area', 'exposure_pattern', 'technical_conclusion', 'professional_approval']) assert.ok(lpReqs.includes(code));
});

test('serviço central impede aprovação sem profissional e preserva CPF protegido', () => {
  assert.match(exposureLib, /encryptSecret\(cpf\)/);
  assert.match(exposureLib, /sensitiveHash\(cpf\)/);
  assert.match(exposureLib, /approvedProfessional/);
  assert.match(exposureLib, /status === 'APPROVED' \? await approvedProfessional/);
  assert.match(exposureLib, /exposurePeriodsOverlap/);
  assert.match(exposureLib, /status = findings\.some\(\(finding\) => finding\.severity === 'ERROR'\) \? 'DRAFT' : 'VALIDATED'/);
});

test('rotas exigem permissões distintas e registram emissão de rascunhos e conclusões', () => {
  assert.match(ltcatRoute, /authorizeTenantApi\('technical\.conclusion\.approve'\)/);
  assert.match(insalubrityRoute, /authorizeTenantApi\('technical\.conclusion\.approve'\)/);
  assert.match(periculosidadeRoute, /authorizeTenantApi\('technical\.conclusion\.approve'\)/);
  assert.match(pppRoute, /authorizeTenantApi\('ppp\.prepare'\)/);
  assert.match(s2240Route, /authorizeTenantApi\('esocial\.s2240\.prepare'\)/);
  assert.match(pppRoute, /PPP_DRAFT_PREPARED/);
  assert.match(s2240Route, /ESOCIAL_S2240_DRAFT_PREPARED/);
});

test('interface e modelos documentais cobrem histórico, PPP, S-2240, NR-15 e NR-16', () => {
  for (const text of ['Exposições, períodos e conclusões', 'Conclusão previdenciária do LTCAT', 'Preparar PPP', 'Preparar S-2240', 'Conclusão de insalubridade', 'Anexo NR-15', 'Conclusão de periculosidade', 'Categoria NR-16']) assert.match(exposurePage, new RegExp(text));
  for (const code of ['OCCUPATIONAL_HISTORY', 'AGENTS', 'MEASUREMENTS', 'CONTROLS', 'SOCIAL_SECURITY_CONCLUSION', 'PPP', 'ESOCIAL_S2240', 'ANNEX_FRAMEWORK', 'CONTROLS_NEUTRALIZATION', 'DANGEROUS_CONDITIONS', 'RISK_AREA', 'EXPOSURE_PATTERN']) assert.match(sections, new RegExp(code));
});

test('copiloto recebe somente panorama e auditoria, não ferramentas de conclusão técnica', () => {
  assert.match(aiCatalog, /get_exposure_overview/);
  assert.match(aiCatalog, /run_exposure_audit/);
  assert.match(aiTools, /getExposureOverview/);
  assert.match(aiTools, /runExposureAudit/);
  assert.doesNotMatch(aiCatalog, /approve_ltcat|approve_insalubrity|approve_dangerous|issue_ppp|transmit_s2240/i);
});

test('núcleo de exposições permanece atrás de feature flags independentes', () => {
  for (const flag of ['FEATURE_EXPOSURE_CORE', 'FEATURE_LTCAT_PPP', 'FEATURE_INSALUBRIDADE', 'FEATURE_PERICULOSIDADE', 'FEATURE_ESOCIAL_S2240']) assert.match(env, new RegExp(flag));
  assert.match(env, /FEATURE_EXPOSURE_CORE:[\s\S]*default\(false\)/);
});
