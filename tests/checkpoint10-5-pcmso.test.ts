import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isValidCpf, maskCpf, normalizeCpf } from '../src/domain/pcmso/identity.ts';
import { addMonthsClamped, normalizeOccupationalExamTypes, periodicDueDate, requirementAppliesToWorker, requirementsForWorker, shortestPeriodicity } from '../src/domain/pcmso/matrix.ts';
import { buildS2220Payload, validateS2220Input } from '../src/domain/pcmso/esocial-s2220.ts';
import { auditPcmsoCompleteness } from '../src/domain/pcmso/audit.ts';
import { workflowDefinitionFor } from '../src/domain/workflows/templates.ts';
import { hasTenantPermission } from '../src/lib/rbac.ts';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');
const pcmsoLib = readFileSync('src/lib/pcmso.ts', 'utf8');
const pcmsoPage = readFileSync('src/app/(app)/pcmso/[id]/page.tsx', 'utf8');
const asoRoute = readFileSync('src/app/api/pcmso/[id]/asos/route.ts', 'utf8');
const workerRoute = readFileSync('src/app/api/pcmso/[id]/workers/route.ts', 'utf8');
const reportRoute = readFileSync('src/app/api/pcmso/[id]/analytical-report/route.ts', 'utf8');
const esocialRoute = readFileSync('src/app/api/pcmso/[id]/esocial/[asoId]/route.ts', 'utf8');
const aiCatalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const aiTools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const sections = readFileSync('src/domain/documents/default-sections.ts', 'utf8');

const completeAudit = {
  hasScope: true,
  hasResponsiblePhysician: true,
  hasPgrReference: true,
  activeWorkerCount: 10,
  examCatalogCount: 3,
  examRequirementCount: 3,
  workersWithoutMatrixCoverage: 0,
  overdueCallCount: 0,
  callsMissingProvider: 0,
  issuedAsoCount: 10,
  asosPendingFitness: 0,
  asosWithoutExams: 0,
  s2220ReadyCount: 10,
  s2220InvalidCount: 0,
  analyticalReportCount: 1,
  workflowProgress: 100,
};

const validS2220Input = {
  employerRegistration: '12345678000195',
  workerCpf: '529.982.247-25',
  workerRegistration: 'MAT-001',
  examType: 'PERIODIC' as const,
  asoDate: new Date('2026-07-10T12:00:00.000Z'),
  fitnessResult: 'FIT',
  exams: [{ performedAt: new Date('2026-07-09T12:00:00.000Z'), procedureCode: '0295', resultStatus: 'COMPLETED' }],
  physician: { name: 'Dra. Ana Médica', cpf: '52998224725', councilNumber: '12345', councilState: 'SP' },
  processVersion: 'sst-saas-10.5',
};

test('schema cria núcleo PCMSO, ASO, relatório, acesso médico e S-2220', () => {
  for (const model of ['PcmsoProgram', 'MedicalProvider', 'MedicalProfessional', 'OccupationalWorker', 'PcmsoExamCatalog', 'PcmsoExamRequirement', 'PcmsoCall', 'OccupationalAso', 'OccupationalAsoExam', 'PcmsoAnalyticalReport', 'EsocialS2220Draft', 'MedicalDataAccessLog', 'PcmsoAuditRun']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /model PcmsoProgram \{[\s\S]*workProjectId\s+String\s+@unique/);
  assert.match(schema, /model OccupationalWorker \{[\s\S]*cpfEncrypted[\s\S]*cpfHash/);
  assert.match(schema, /model OccupationalAso \{[\s\S]*restrictionsEncrypted[\s\S]*physicianNotesEncrypted/);
});

test('RBAC separa gestão ocupacional de decisão e dados clínicos', () => {
  assert.equal(hasTenantPermission('ADMIN', 'medical.program.manage'), true);
  assert.equal(hasTenantPermission('ADMIN', 'medical.clinical.read'), false);
  assert.equal(hasTenantPermission('CONSULTANT', 'medical.worker.manage'), true);
  assert.equal(hasTenantPermission('CONSULTANT', 'medical.aso.issue'), false);
  assert.equal(hasTenantPermission('MEDICAL_ASSISTANT', 'medical.clinical.write'), true);
  assert.equal(hasTenantPermission('MEDICAL_ASSISTANT', 'medical.aso.issue'), false);
  assert.equal(hasTenantPermission('OCCUPATIONAL_PHYSICIAN', 'medical.aso.issue'), true);
});

test('CPF ocupacional é validado, normalizado e mascarado', () => {
  assert.equal(normalizeCpf('529.982.247-25'), '52998224725');
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(maskCpf('52998224725'), '***.982.247-**');
});

test('matriz de exames filtra GHE/função e normaliza eventos ocupacionais', () => {
  const rules = [
    { id: 'r1', gheId: 'g1', occupationalExamTypes: ['PERIODIC'], periodicityMonths: 12, active: true },
    { id: 'r2', jobFunctionId: 'f2', occupationalExamTypes: 'ADMISSION, TERMINATION', periodicityMonths: 24, active: true },
    { id: 'r3', gheId: 'g2', occupationalExamTypes: ['PERIODIC'], active: false },
  ];
  assert.deepEqual(normalizeOccupationalExamTypes('periodic, termination, invalid'), ['PERIODIC', 'TERMINATION']);
  assert.equal(requirementAppliesToWorker(rules[0], { gheId: 'g1', jobFunctionId: 'f1' }), true);
  assert.equal(requirementAppliesToWorker(rules[1], { gheId: 'g1', jobFunctionId: 'f1' }), false);
  assert.equal(requirementsForWorker(rules, { gheId: 'g1', jobFunctionId: 'f1' }, 'PERIODIC').length, 1);
  assert.equal(shortestPeriodicity(rules), 12);
});

test('vencimento periódico preserva final do mês e usa último ASO como referência', () => {
  assert.equal(addMonthsClamped(new Date('2024-01-31T12:00:00.000Z'), 1).toISOString().slice(0, 10), '2024-02-29');
  assert.equal(periodicDueDate({ lastAsoAt: new Date('2025-06-30T12:00:00.000Z'), admissionDate: new Date('2020-01-01T12:00:00.000Z'), referenceDate: new Date('2026-01-01T12:00:00.000Z'), periodicityMonths: 12 }).toISOString().slice(0, 10), '2026-06-30');
  assert.throws(() => addMonthsClamped(new Date(), 0), /Periodicidade/);
});

test('S-2220 gera payload S-1.3 sem transmitir e mapeia exame periódico', () => {
  const payload = buildS2220Payload(validS2220Input);
  assert.equal(payload.version, 'S-1.3');
  assert.equal(payload.event, 'S-2220');
  assert.equal(payload.evtMonit.exMedOcup.tpExameOcup, '1');
  assert.equal(payload.evtMonit.exMedOcup.aso.resAso, '1');
  assert.equal(payload.evtMonit.ideVinculo.cpfTrab, '52998224725');
  assert.deepEqual(payload.evtMonit.ideEmpregador, { tpInsc: '1', nrInsc: '12345678' });
  assert.deepEqual(validateS2220Input(validS2220Input), []);
  const pointPayload = buildS2220Payload({ ...validS2220Input, employerRegistration: 'AB.C12.3D4/EF56-78', examType: 'POINT_MONITORING' });
  assert.equal(pointPayload.evtMonit.exMedOcup.tpExameOcup, '4');
  assert.deepEqual(pointPayload.evtMonit.ideEmpregador, { tpInsc: '1', nrInsc: 'ABC123D4' });
});

test('validação S-2220 bloqueia vínculo, CPF, exames e identificação médica incompletos', () => {
  const findings = validateS2220Input({ ...validS2220Input, employerRegistration: '1', workerCpf: '11111111111', workerRegistration: null, workerCategoryCode: null, exams: [], physician: { name: '', cpf: '1', councilNumber: '', councilState: 'XX' } });
  for (const code of ['EMPLOYER_REGISTRATION', 'WORKER_CPF', 'WORKER_LINK', 'ASO_EXAMS', 'PHYSICIAN_NAME', 'PHYSICIAN_CPF', 'PHYSICIAN_COUNCIL']) assert.ok(findings.some((item) => item.code === code));
});

test('auditoria PCMSO aprova programa completo e reprova ausência de médico/matriz/cobertura', () => {
  assert.equal(auditPcmsoCompleteness(completeAudit).status, 'PASSED');
  const failed = auditPcmsoCompleteness({ ...completeAudit, hasResponsiblePhysician: false, examRequirementCount: 0, workersWithoutMatrixCoverage: 4, asosPendingFitness: 1 });
  assert.equal(failed.status, 'FAILED');
  for (const code of ['PCMSO_PHYSICIAN_MISSING', 'PCMSO_MATRIX_EMPTY', 'PCMSO_MATRIX_COVERAGE', 'PCMSO_ASO_FITNESS']) assert.ok(failed.findings.some((item) => item.code === code));
});

test('workflow PCMSO versão 2 cobre PGR, matriz, ASO, privacidade, relatório e S-2220', () => {
  const workflow = workflowDefinitionFor('PCMSO');
  assert.equal(workflow.version, 2);
  for (const step of ['worker_population', 'risk_mapping', 'medical_plan', 'health_monitoring', 'analytical_report', 'esocial_monitoring']) assert.ok(workflow.steps.some((item) => item.code === step));
  const requirements = workflow.steps.flatMap((step) => step.requirements.map((item) => item.code));
  for (const code of ['worker_roster', 'active_worker_population', 'pgr_reference', 'responsible_physician', 'exam_matrix', 'aso_tracking', 'confidential_records', 'aggregated_indicators', 's2220_preparation', 'transmission_approval']) assert.ok(requirements.includes(code));
});

test('serviço PCMSO protege dados, evita duplicidade e registra acesso sensível', () => {
  assert.match(pcmsoLib, /encryptSecret\(cpf\)/);
  assert.match(pcmsoLib, /sensitiveHash\(cpf\)/);
  assert.match(pcmsoLib, /recordMedicalAccess/);
  assert.match(pcmsoLib, /status = 'ISSUED'/);
  assert.match(pcmsoLib, /pcmsoCall\.findFirst/);
  assert.match(pcmsoLib, /pcmsoAnalyticalReport\.upsert/);
  assert.match(pcmsoLib, /status = findings\.some\(\(finding\) => finding\.severity === 'ERROR'\) \? 'DRAFT' : 'VALIDATED'/);
});

test('rotas aplicam permissões distintas para trabalhador, ASO, agregado e eSocial', () => {
  assert.match(workerRoute, /authorizeTenantApi\('medical\.worker\.manage'\)/);
  assert.match(asoRoute, /authorizeTenantApi\('medical\.aso\.issue'\)/);
  assert.match(reportRoute, /authorizeTenantApi\('medical\.analytics\.read'\)/);
  assert.match(esocialRoute, /authorizeTenantApi\('esocial\.prepare'\)/);
  assert.match(asoRoute, /OCCUPATIONAL_ASO_ISSUED/);
  assert.match(esocialRoute, /ESOCIAL_S2220_DRAFT_PREPARED/);
});

test('interface e documento contemplam área médica, matriz, convocações, ASO, relatório e S-2220', () => {
  for (const text of ['PCMSO e Saúde Ocupacional', 'Matriz de avaliações clínicas e exames', 'Convocações e vencimentos', 'Relatório analítico e auditoria', 'Emitir ASO', 'Preparar S-2220']) assert.match(pcmsoPage, new RegExp(text));
  assert.match(pcmsoPage, /FEATURE_MEDICAL_AREA/);
  for (const code of ['RISK_INTEGRATION', 'MEDICAL_PLANNING', 'EXAM_MATRIX', 'HEALTH_MONITORING', 'ANALYTICAL_REPORT', 'ESOCIAL_S2220']) assert.match(sections, new RegExp(code));
});

test('copiloto só recebe panorama e auditoria do PCMSO, sem ferramenta clínica de aptidão', () => {
  assert.match(aiCatalog, /name: 'get_pcmso_overview'/);
  assert.match(aiCatalog, /name: 'run_pcmso_audit'/);
  assert.match(aiTools, /case 'get_pcmso_overview'/);
  assert.match(aiTools, /case 'run_pcmso_audit'/);
  assert.match(aiTools, /serviceType !== 'PCMSO'/);
  assert.doesNotMatch(aiCatalog, /name: 'issue_aso'/);
  assert.doesNotMatch(aiCatalog, /name: 'set_fitness_result'/);
});

test('PCMSO, área médica e preparação S-2220 permanecem sob feature flags independentes', () => {
  assert.match(env, /FEATURE_PCMSO/);
  assert.match(env, /FEATURE_MEDICAL_AREA/);
  assert.match(env, /FEATURE_ESOCIAL_S2220/);
});
