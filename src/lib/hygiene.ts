import type {
  ExposureAssessmentMethod,
  HygieneAgentCategory,
  HygieneSamplingStrategy,
  InstrumentEventType,
  MeasurementInstrumentStatus,
  MeasurementInstrumentType,
} from '@prisma/client';
import { auditHygieneCompleteness } from '@/domain/hygiene/audit';
import { calculateHygieneMethod, interpretHygieneResult } from '@/domain/hygiene/calculations';
import { calibrationState, canUseInstrument, validateFieldCalibration } from '@/domain/hygiene/instruments';
import { hygieneMethod } from '@/domain/hygiene/catalog';
import { db } from './db';
import { toPrismaJson } from './prisma-json';
import { refreshWorkflowStepFromRequirements } from './work-projects';

async function hygieneProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({ where: { id: workProjectId, tenantId, serviceType: 'HIGIENE_OCUPACIONAL' }, include: { company: { select: { id: true, legalName: true, tradeName: true } } } });
  if (!project) throw new Error('Trabalho de higiene ocupacional não encontrado');
  return project;
}

async function satisfyRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

async function approvedProfessional(tenantId: string, userId?: string) {
  if (!userId) throw new Error('Revisão exige profissional responsável autenticado');
  const professional = await db.occupationalTechnicalProfessional.findFirst({ where: { tenantId, userId, active: true } });
  if (!professional) throw new Error('Usuário não está vinculado a profissional técnico habilitado');
  return professional;
}

export async function getOrCreateHygieneProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await hygieneProject(input.tenantId, input.workProjectId);
  const existing = await db.occupationalHygieneProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const professional = input.userId ? await db.occupationalTechnicalProfessional.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, active: true } }) : null;
  const program = await db.occupationalHygieneProgram.create({ data: {
    tenantId: input.tenantId,
    companyId: project.companyId,
    workProjectId: project.id,
    responsibleProfessionalId: professional?.id ?? null,
    title: `Higiene Ocupacional — ${project.company.tradeName ?? project.company.legalName}`,
    status: 'IN_PROGRESS',
    scope: 'Planejar, executar, revisar e documentar avaliações de exposições ocupacionais com rastreabilidade de amostras, equipamentos, calibrações e memória de cálculo.',
    methodology: toPrismaJson({ approach: 'estratégia_por_GHE_e_tarefa', stages: ['reconhecimento', 'planejamento', 'campo', 'processamento', 'revisão', 'integração'] }),
    legalReferences: toPrismaJson(['NR-9 — avaliação e controle das exposições ocupacionais', 'NHOs Fundacentro aplicáveis', 'NR-15 e critérios técnicos conforme finalidade']),
    limitations: toPrismaJson(['A IA não cria medições inexistentes.', 'Resultados automáticos exigem validação de método, instrumento, calibração, jornada e aplicabilidade.', 'Conclusões legais e técnicas dependem de profissional habilitado.']),
  } });
  await satisfyRequirement(project.id, 'technical_scope', 'OccupationalHygieneProgram', program.id);
  if (program.responsibleProfessionalId) await satisfyRequirement(project.id, 'technical_responsible', 'OccupationalTechnicalProfessional', program.responsibleProfessionalId);
  await satisfyRequirement(project.id, 'method_limitations', 'OccupationalHygieneProgram', program.id);
  return program;
}

export async function saveMeasurementInstrument(input: {
  tenantId: string; companyId?: string | null; code: string; type: MeasurementInstrumentType; status?: MeasurementInstrumentStatus;
  manufacturer?: string | null; model?: string | null; serialNumber?: string | null; patrimonyNumber?: string | null;
  measurementRange?: string | null; resolution?: string | null; currentLocation?: string | null; currentHolder?: string | null;
  calibrationRequired?: boolean;
}) {
  const code = input.code.trim().toUpperCase();
  if (code.length < 2) throw new Error('Código do instrumento é obrigatório');
  if (input.companyId) {
    const company = await db.company.findFirst({ where: { id: input.companyId, tenantId: input.tenantId } });
    if (!company) throw new Error('Empresa não pertence à consultoria');
  }
  return db.measurementInstrument.upsert({
    where: { tenantId_code: { tenantId: input.tenantId, code } },
    update: { companyId: input.companyId ?? null, type: input.type, status: input.status ?? 'AVAILABLE', manufacturer: input.manufacturer?.trim() || null, model: input.model?.trim() || null, serialNumber: input.serialNumber?.trim() || null, patrimonyNumber: input.patrimonyNumber?.trim() || null, measurementRange: input.measurementRange?.trim() || null, resolution: input.resolution?.trim() || null, currentLocation: input.currentLocation?.trim() || null, currentHolder: input.currentHolder?.trim() || null, calibrationRequired: input.calibrationRequired ?? true, active: true },
    create: { tenantId: input.tenantId, companyId: input.companyId ?? null, code, type: input.type, status: input.status ?? 'AVAILABLE', manufacturer: input.manufacturer?.trim() || null, model: input.model?.trim() || null, serialNumber: input.serialNumber?.trim() || null, patrimonyNumber: input.patrimonyNumber?.trim() || null, measurementRange: input.measurementRange?.trim() || null, resolution: input.resolution?.trim() || null, currentLocation: input.currentLocation?.trim() || null, currentHolder: input.currentHolder?.trim() || null, calibrationRequired: input.calibrationRequired ?? true },
  });
}

export async function saveInstrumentCalibration(input: { tenantId: string; instrumentId: string; certificateNumber: string; laboratory: string; accredited?: boolean; calibratedAt: Date; validUntil: Date; result?: string | null; uncertainty?: number | null; certificateFileId?: string | null; userId?: string }) {
  const instrument = await db.measurementInstrument.findFirst({ where: { id: input.instrumentId, tenantId: input.tenantId, active: true } });
  if (!instrument) throw new Error('Instrumento não encontrado');
  if (input.validUntil <= input.calibratedAt) throw new Error('Validade da calibração deve ser posterior à data de calibração');
  if (input.certificateFileId) {
    const file = await db.fileObject.findFirst({ where: { id: input.certificateFileId, tenantId: input.tenantId } });
    if (!file) throw new Error('Certificado não pertence à consultoria');
  }
  const status = calibrationState({ calibratedAt: input.calibratedAt, validUntil: input.validUntil, rejected: input.result?.toUpperCase() === 'REPROVADO' });
  const row = await db.instrumentCalibration.upsert({
    where: { instrumentId_certificateNumber: { instrumentId: instrument.id, certificateNumber: input.certificateNumber.trim() } },
    update: { laboratory: input.laboratory.trim(), accredited: input.accredited ?? false, calibratedAt: input.calibratedAt, validUntil: input.validUntil, status, result: input.result?.trim() || null, uncertainty: input.uncertainty ?? null, certificateFileId: input.certificateFileId ?? null, createdById: input.userId ?? null },
    create: { instrumentId: instrument.id, certificateNumber: input.certificateNumber.trim(), laboratory: input.laboratory.trim(), accredited: input.accredited ?? false, calibratedAt: input.calibratedAt, validUntil: input.validUntil, status, result: input.result?.trim() || null, uncertainty: input.uncertainty ?? null, certificateFileId: input.certificateFileId ?? null, createdById: input.userId ?? null },
  });
  await db.measurementInstrument.update({ where: { id: instrument.id }, data: { nextCalibrationAt: input.validUntil, status: ['VALID', 'EXPIRING'].includes(status) ? 'AVAILABLE' : 'BLOCKED' } });
  await db.instrumentEvent.create({ data: { instrumentId: instrument.id, type: 'CALIBRATED', occurredAt: input.calibratedAt, dueAt: input.validUntil, notes: `${input.laboratory.trim()} · ${input.certificateNumber.trim()}`, createdById: input.userId ?? null } });
  return row;
}

export async function saveSamplingPlan(input: {
  tenantId: string; workProjectId: string; code: string; title: string; agentCategory: HygieneAgentCategory; strategy: HygieneSamplingStrategy;
  objective: string; assessmentType: ExposureAssessmentMethod; gheId?: string | null; jobFunctionId?: string | null; workstationId?: string | null;
  representativeWorkerId?: string | null; minimumSamples?: number; expectedDurationMinutes?: number | null; methodCode?: string | null; methodVersion?: string | null;
  technique?: string | null; acceptanceCriteria?: Record<string, unknown>; fieldChecklist?: string[]; scheduledAt?: Date | null; notes?: string | null; userId?: string;
}) {
  const project = await hygieneProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateHygieneProgram(input);
  const code = input.code.trim().toUpperCase(); const title = input.title.trim(); const objective = input.objective.trim();
  if (code.length < 2 || title.length < 3 || objective.length < 10) throw new Error('Código, título e objetivo detalhado são obrigatórios');
  if ((input.minimumSamples ?? 1) < 1) throw new Error('Quantidade mínima de amostras deve ser positiva');
  const method = input.methodCode ? hygieneMethod(input.methodCode) : null;
  if (input.methodCode && !method) throw new Error('Método informado não está no catálogo');
  if (input.gheId) {
    const ghe = await db.gHE.findFirst({ where: { id: input.gheId, sector: { establishment: { companyId: project.companyId } } } });
    if (!ghe) throw new Error('GHE não pertence à empresa');
  }
  const row = await db.hygieneSamplingPlan.upsert({
    where: { hygieneProgramId_code: { hygieneProgramId: program.id, code } },
    update: { title, agentCategory: input.agentCategory, strategy: input.strategy, objective, assessmentType: input.assessmentType, gheId: input.gheId ?? null, jobFunctionId: input.jobFunctionId ?? null, workstationId: input.workstationId ?? null, representativeWorkerId: input.representativeWorkerId ?? null, minimumSamples: input.minimumSamples ?? 1, expectedDurationMinutes: input.expectedDurationMinutes ?? null, methodCode: method?.code ?? input.methodCode?.trim() ?? null, methodVersion: input.methodVersion?.trim() || method?.currentEdition || null, technique: input.technique?.trim() || null, acceptanceCriteria: toPrismaJson(input.acceptanceCriteria ?? {}), fieldChecklist: toPrismaJson(input.fieldChecklist ?? []), scheduledAt: input.scheduledAt ?? null, notes: input.notes?.trim() || null, status: 'PLANNED' },
    create: { hygieneProgramId: program.id, code, title, agentCategory: input.agentCategory, strategy: input.strategy, objective, assessmentType: input.assessmentType, gheId: input.gheId ?? null, jobFunctionId: input.jobFunctionId ?? null, workstationId: input.workstationId ?? null, representativeWorkerId: input.representativeWorkerId ?? null, minimumSamples: input.minimumSamples ?? 1, expectedDurationMinutes: input.expectedDurationMinutes ?? null, methodCode: method?.code ?? input.methodCode?.trim() ?? null, methodVersion: input.methodVersion?.trim() || method?.currentEdition || null, technique: input.technique?.trim() || null, acceptanceCriteria: toPrismaJson(input.acceptanceCriteria ?? {}), fieldChecklist: toPrismaJson(input.fieldChecklist ?? []), scheduledAt: input.scheduledAt ?? null, notes: input.notes?.trim() || null, status: 'PLANNED', createdById: input.userId ?? null },
  });
  await satisfyRequirement(project.id, 'agent_objective', 'HygieneSamplingPlan', row.id);
  await satisfyRequirement(project.id, 'sampling_strategy', 'HygieneSamplingPlan', row.id);
  if (row.methodCode) await satisfyRequirement(project.id, 'methodology_version', 'HygieneSamplingPlan', row.id);
  if (input.gheId || input.representativeWorkerId) await satisfyRequirement(project.id, 'representative_groups', 'HygieneSamplingPlan', row.id);
  if ((input.fieldChecklist ?? []).filter((item) => item.trim().length > 0).length > 0) await satisfyRequirement(project.id, 'field_checklist', 'HygieneSamplingPlan', row.id);
  return row;
}

export async function saveHygieneMeasurement(input: {
  tenantId: string; workProjectId: string; samplingPlanId: string; instrumentId?: string | null; exposureAgentId?: string | null;
  measuredAt?: Date; startedAt?: Date | null; endedAt?: Date | null; methodCode: string; methodVersion?: string | null; technique?: string | null;
  engineInputs?: Record<string, unknown>; manualResult?: number | null; unit?: string | null; actionLevel?: number | null; toleranceLimit?: number | null;
  rawData?: Record<string, unknown>; environmentalConditions?: Record<string, unknown>; uncertainty?: number | null;
  fieldCalibrationBefore?: Record<string, unknown>; fieldCalibrationAfter?: Record<string, unknown>; notes?: string | null; userId?: string;
}) {
  const program = await getOrCreateHygieneProgram(input);
  const plan = await db.hygieneSamplingPlan.findFirst({ where: { id: input.samplingPlanId, hygieneProgramId: program.id } });
  if (!plan) throw new Error('Plano de amostragem não pertence ao trabalho');
  const method = hygieneMethod(input.methodCode);
  if (!method) throw new Error('Método de higiene ocupacional não reconhecido');
  let instrument: { id: string; status: MeasurementInstrumentStatus; calibrationRequired: boolean } | null = null;
  let calibration: { id: string; calibratedAt: Date; validUntil: Date; status: string } | null = null;
  if (input.instrumentId) {
    instrument = await db.measurementInstrument.findFirst({ where: { id: input.instrumentId, tenantId: input.tenantId, active: true }, select: { id: true, status: true, calibrationRequired: true } });
    if (!instrument) throw new Error('Instrumento não pertence à consultoria');
    calibration = await db.instrumentCalibration.findFirst({ where: { instrumentId: instrument.id }, orderBy: { validUntil: 'desc' }, select: { id: true, calibratedAt: true, validUntil: true, status: true } });
    const state = calibration ? calibrationState({ calibratedAt: calibration.calibratedAt, validUntil: calibration.validUntil, rejected: calibration.status === 'REJECTED', pending: calibration.status === 'PENDING' }, input.measuredAt ?? new Date()) : null;
    const usable = canUseInstrument({ status: instrument.status, calibrationRequired: instrument.calibrationRequired, calibrationStatus: state });
    if (!usable.allowed) throw new Error(usable.findings.join(' '));
  } else if (method.requiresInstrument) throw new Error('O método selecionado exige instrumento vinculado');
  const calculated = calculateHygieneMethod(method.code, input.engineInputs ?? {});
  const result = calculated.calculated ? calculated.result : input.manualResult;
  if (result == null || !Number.isFinite(result)) throw new Error('Resultado manual é obrigatório quando o método não possui motor determinístico');
  const interpretation = interpretHygieneResult({ result, actionLevel: input.actionLevel, toleranceLimit: input.toleranceLimit });
  const fieldBefore = input.fieldCalibrationBefore ?? {}; const fieldAfter = input.fieldCalibrationAfter ?? {};
  const beforeValue = typeof fieldBefore.value === 'number' ? fieldBefore.value : null; const afterValue = typeof fieldAfter.value === 'number' ? fieldAfter.value : null;
  const fieldValidation = method.requiresInstrument ? validateFieldCalibration({ before: beforeValue, after: afterValue, tolerance: typeof fieldBefore.tolerance === 'number' ? fieldBefore.tolerance : null }) : { valid: true, deviation: null, findings: [] as string[] };
  const status = fieldValidation.valid ? 'REVIEW' : 'INVALID';
  const row = await db.hygieneMeasurement.create({ data: {
    samplingPlanId: plan.id, exposureAgentId: input.exposureAgentId ?? null, instrumentId: instrument?.id ?? null, calibrationId: calibration?.id ?? null,
    status, measuredAt: input.measuredAt ?? new Date(), startedAt: input.startedAt ?? null, endedAt: input.endedAt ?? null, result, normalizedResult: result,
    unit: input.unit?.trim() || null, actionLevel: input.actionLevel ?? null, toleranceLimit: input.toleranceLimit ?? null, interpretation,
    methodCode: method.code, methodVersion: input.methodVersion?.trim() || method.currentEdition || null, technique: input.technique?.trim() || null,
    calculationMemory: toPrismaJson({ ...calculated.calculationMemory, limitations: calculated.limitations, fieldCalibrationFindings: fieldValidation.findings }),
    rawData: toPrismaJson(input.rawData ?? {}), environmentalConditions: toPrismaJson(input.environmentalConditions ?? {}), uncertainty: input.uncertainty ?? null,
    fieldCalibrationBefore: toPrismaJson(fieldBefore), fieldCalibrationAfter: toPrismaJson(fieldAfter), notes: input.notes?.trim() || null, createdById: input.userId ?? null,
  } });
  await db.hygieneSamplingPlan.update({ where: { id: plan.id }, data: { status: 'REVIEW', startedAt: plan.startedAt ?? new Date() } });
  await satisfyRequirement(input.workProjectId, 'raw_data', 'HygieneMeasurement', row.id);
  await satisfyRequirement(input.workProjectId, 'calculation_memory', 'HygieneMeasurement', row.id);
  if (input.actionLevel != null || input.toleranceLimit != null) await satisfyRequirement(input.workProjectId, 'limits_comparison', 'HygieneMeasurement', row.id);
  if (instrument && calibration) await satisfyRequirement(input.workProjectId, 'equipment_calibration', 'InstrumentCalibration', calibration.id);
  if (method.requiresInstrument && fieldValidation.valid) await satisfyRequirement(input.workProjectId, 'field_calibration', 'HygieneMeasurement', row.id);
  if (input.uncertainty != null) await satisfyRequirement(input.workProjectId, 'uncertainty', 'HygieneMeasurement', row.id);
  if (input.exposureAgentId) await satisfyRequirement(input.workProjectId, 'exposure_integration', 'OccupationalExposureAgent', input.exposureAgentId);
  const sampleCount = await db.hygieneMeasurement.count({ where: { samplingPlanId: plan.id } });
  if (sampleCount >= plan.minimumSamples) await satisfyRequirement(input.workProjectId, 'minimum_samples', 'HygieneSamplingPlan', plan.id);
  return row;
}

export async function reviewHygieneMeasurement(input: { tenantId: string; workProjectId: string; measurementId: string; approved: boolean; userId?: string }) {
  const program = await getOrCreateHygieneProgram(input);
  await approvedProfessional(input.tenantId, input.userId);
  const measurement = await db.hygieneMeasurement.findFirst({ where: { id: input.measurementId, samplingPlan: { hygieneProgramId: program.id } } });
  if (!measurement) throw new Error('Medição não pertence ao trabalho');
  if (measurement.status === 'INVALID' && input.approved) throw new Error('Medição inválida não pode ser aprovada sem correção');
  const row = await db.hygieneMeasurement.update({ where: { id: measurement.id }, data: { status: input.approved ? 'APPROVED' : 'REJECTED', reviewedById: input.userId ?? null, reviewedAt: new Date() } });
  if (input.approved) {
    await satisfyRequirement(input.workProjectId, 'result_professional_review', 'HygieneMeasurement', row.id);
    await satisfyRequirement(input.workProjectId, 'technical_interpretation', 'HygieneMeasurement', row.id);
  }
  return row;
}

export async function recordInstrumentEvent(input: { tenantId: string; instrumentId: string; workProjectId?: string | null; type: InstrumentEventType; occurredAt?: Date; dueAt?: Date | null; toLocation?: string | null; toHolder?: string | null; notes?: string | null; userId?: string }) {
  const instrument = await db.measurementInstrument.findFirst({ where: { id: input.instrumentId, tenantId: input.tenantId } });
  if (!instrument) throw new Error('Instrumento não encontrado');
  if (input.workProjectId) await hygieneProject(input.tenantId, input.workProjectId);
  const statusByEvent: Partial<Record<InstrumentEventType, MeasurementInstrumentStatus>> = { RESERVED: 'RESERVED', CHECKED_OUT: 'IN_USE', RETURNED: 'AVAILABLE', MAINTENANCE: 'MAINTENANCE', BLOCKED: 'BLOCKED', RETIRED: 'RETIRED', CALIBRATED: 'AVAILABLE' };
  const row = await db.instrumentEvent.create({ data: { instrumentId: instrument.id, workProjectId: input.workProjectId ?? null, type: input.type, occurredAt: input.occurredAt ?? new Date(), dueAt: input.dueAt ?? null, fromLocation: instrument.currentLocation, toLocation: input.toLocation?.trim() || null, fromHolder: instrument.currentHolder, toHolder: input.toHolder?.trim() || null, notes: input.notes?.trim() || null, createdById: input.userId ?? null } });
  await db.measurementInstrument.update({ where: { id: instrument.id }, data: { status: statusByEvent[input.type] ?? instrument.status, currentLocation: input.toLocation?.trim() || instrument.currentLocation, currentHolder: input.toHolder?.trim() || (input.type === 'RETURNED' ? null : instrument.currentHolder), active: input.type !== 'RETIRED' } });
  if (input.workProjectId) await satisfyRequirement(input.workProjectId, 'instrument_history', 'InstrumentEvent', row.id);
  return row;
}

export async function getHygieneOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await hygieneProject(input.tenantId, input.workProjectId);
  const program = await db.occupationalHygieneProgram.findUnique({ where: { workProjectId: project.id }, include: { samplingPlans: { include: { measurements: { include: { instrument: true, calibration: true } } }, orderBy: { createdAt: 'desc' } }, audits: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  const instruments = await db.measurementInstrument.findMany({ where: { tenantId: input.tenantId, active: true }, include: { calibrations: { orderBy: { validUntil: 'desc' }, take: 1 } } });
  const measurements = program?.samplingPlans.flatMap((plan) => plan.measurements) ?? [];
  return { project: { id: project.id, title: project.title, progress: project.progress, status: project.status }, program, planCount: program?.samplingPlans.length ?? 0, measurementCount: measurements.length, approvedMeasurements: measurements.filter((item) => item.status === 'APPROVED').length, instruments: instruments.map((instrument) => ({ id: instrument.id, code: instrument.code, type: instrument.type, status: instrument.status, calibration: instrument.calibrations[0] ?? null })), latestAudit: program?.audits[0] ?? null };
}

export async function runHygieneAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await hygieneProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateHygieneProgram(input);
  const plans = await db.hygieneSamplingPlan.findMany({ where: { hygieneProgramId: program.id }, include: { measurements: { include: { instrument: true, calibration: true } } } });
  const measurements = plans.flatMap((plan) => plan.measurements);
  const now = new Date();
  const result = auditHygieneCompleteness({
    hasScope: Boolean(program.scope?.trim()), hasResponsibleProfessional: Boolean(program.responsibleProfessionalId), samplingPlanCount: plans.length,
    plansWithoutStrategy: plans.filter((plan) => !plan.objective?.trim() || !plan.strategy || !plan.assessmentType).length,
    plansWithoutMethod: plans.filter((plan) => !plan.methodCode?.trim() || !plan.methodVersion?.trim()).length,
    plansBelowMinimumSamples: plans.filter((plan) => plan.measurements.length < plan.minimumSamples).length,
    measurementCount: measurements.length,
    measurementsWithoutInstrument: measurements.filter((item) => hygieneMethod(item.methodCode)?.requiresInstrument && !item.instrumentId).length,
    measurementsWithInvalidCalibration: measurements.filter((item) => item.instrument?.calibrationRequired && (!item.calibration || !['VALID', 'EXPIRING'].includes(calibrationState({ calibratedAt: item.calibration.calibratedAt, validUntil: item.calibration.validUntil, rejected: item.calibration.status === 'REJECTED', pending: item.calibration.status === 'PENDING' }, item.measuredAt)))).length,
    measurementsWithoutRawData: measurements.filter((item) => !item.rawData || Object.keys(item.rawData as object).length === 0).length,
    measurementsWithoutCalculationMemory: measurements.filter((item) => !item.calculationMemory || Object.keys(item.calculationMemory as object).length === 0).length,
    measurementsWithoutLimits: measurements.filter((item) => item.actionLevel == null && item.toleranceLimit == null).length,
    unreviewedMeasurements: measurements.filter((item) => !['APPROVED', 'REJECTED'].includes(item.status)).length,
    instrumentsBlockedOrExpired: await db.measurementInstrument.count({ where: { tenantId: input.tenantId, OR: [{ status: { in: ['BLOCKED', 'MAINTENANCE'] } }, { nextCalibrationAt: { lt: now } }] } }),
    limitationsRegistered: Array.isArray(program.limitations) && program.limitations.length > 0, workflowProgress: project.progress,
  });
  const row = await db.hygieneAuditRun.create({ data: { hygieneProgramId: program.id, status: result.status, score: result.score, findings: toPrismaJson(result.findings), snapshot: toPrismaJson({ planCount: plans.length, measurementCount: measurements.length, approvedMeasurements: measurements.filter((item) => item.status === 'APPROVED').length, projectProgress: project.progress }), createdById: input.userId ?? null } });
  if (result.status !== 'FAILED') await satisfyRequirement(input.workProjectId, 'technical_audit', 'HygieneAuditRun', row.id);
  return row;
}
