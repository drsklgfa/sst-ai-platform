import type {
  ControlEffectiveness,
  DangerousConditionCategory,
  DangerousConclusion,
  ExposureAgentCategory,
  ExposureAssessmentMethod,
  ExposureControlType,
  ExposurePattern,
  ExposurePurpose,
  InsalubrityDegree,
  LtcatExposureConclusion,
  TechnicalConclusionStatus,
} from '@prisma/client';
import { auditExposureCompleteness } from '@/domain/exposures/audit';
import { assessProtection } from '@/domain/exposures/effectiveness';
import { buildS2240Payload, validateS2240Input } from '@/domain/exposures/esocial-s2240';
import { buildPppSnapshot, validatePppInput } from '@/domain/exposures/ppp';
import { exposurePeriodsOverlap, normalizeExposurePattern, validateExposurePeriod } from '@/domain/exposures/periods';
import { nr15Annex, nr16Activity } from '@/domain/exposures/catalog';
import { maskCpf } from '@/domain/pcmso/identity';
import { db } from './db';
import { decryptSecret, encryptSecret, sensitiveHash } from './secrets';
import { randomToken } from './crypto';
import { refreshWorkflowStepFromRequirements } from './work-projects';
import { toPrismaJson } from './prisma-json';

const supportedPurposes: Record<string, ExposurePurpose> = {
  LTCAT: 'LTCAT',
  INSALUBRIDADE: 'INSALUBRIDADE',
  PERICULOSIDADE: 'PERICULOSIDADE',
  HIGIENE_OCUPACIONAL: 'HIGIENE_OCUPACIONAL',
};

async function satisfyRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

async function exposureProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({
    where: { id: workProjectId, tenantId, serviceType: { in: Object.keys(supportedPurposes) } },
    include: { company: { select: { id: true, legalName: true, tradeName: true, cnpj: true, employeeCount: true } } },
  });
  if (!project) throw new Error('Trabalho de exposição ocupacional não encontrado');
  return project;
}

async function validateStructure(companyId: string, input: { workerId?: string | null; establishmentId?: string | null; sectorId?: string | null; gheId?: string | null; jobFunctionId?: string | null }) {
  if (input.workerId) {
    const row = await db.occupationalWorker.findFirst({ where: { id: input.workerId, companyId } });
    if (!row) throw new Error('Trabalhador não pertence à empresa');
  }
  if (input.establishmentId) {
    const row = await db.establishment.findFirst({ where: { id: input.establishmentId, companyId, active: true } });
    if (!row) throw new Error('Estabelecimento não pertence à empresa');
  }
  if (input.sectorId) {
    const row = await db.sector.findFirst({ where: { id: input.sectorId, active: true, establishment: { companyId } } });
    if (!row) throw new Error('Setor não pertence à empresa');
    if (input.establishmentId && row.establishmentId !== input.establishmentId) throw new Error('Setor não pertence ao estabelecimento selecionado');
  }
  if (input.gheId) {
    const row = await db.gHE.findFirst({ where: { id: input.gheId, active: true, sector: { establishment: { companyId } } } });
    if (!row) throw new Error('GHE não pertence à empresa');
    if (input.sectorId && row.sectorId !== input.sectorId) throw new Error('GHE não pertence ao setor selecionado');
  }
  if (input.jobFunctionId) {
    const row = await db.jobFunction.findFirst({ where: { id: input.jobFunctionId, active: true, ghe: { sector: { establishment: { companyId } } } } });
    if (!row) throw new Error('Função não pertence à empresa');
    if (input.gheId && row.gheId !== input.gheId) throw new Error('Função não pertence ao GHE selecionado');
  }
}

export async function getOrCreateExposureProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const existing = await db.occupationalExposureProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const purpose = supportedPurposes[project.serviceType];
  const responsible = await db.occupationalTechnicalProfessional.findFirst({ where: { tenantId: input.tenantId, active: true }, orderBy: { updatedAt: 'desc' } });
  const nextReviewAt = new Date();
  nextReviewAt.setUTCFullYear(nextReviewAt.getUTCFullYear() + 1);
  const legalReferences = purpose === 'LTCAT'
    ? ['Lei 8.213/1991 e regulamentação previdenciária aplicável', 'eSocial S-2240 — Condições Ambientais do Trabalho', 'PPP eletrônico']
    : purpose === 'INSALUBRIDADE'
      ? ['NR-15 — Atividades e Operações Insalubres', 'CLT — caracterização por profissional habilitado']
      : purpose === 'PERICULOSIDADE'
        ? ['NR-16 — Atividades e Operações Perigosas', 'CLT — caracterização por profissional habilitado']
        : ['NR-9 — Avaliação e controle das exposições', 'NHOs e metodologias técnicas aplicáveis'];
  const program = await db.occupationalExposureProgram.create({
    data: {
      tenantId: input.tenantId,
      companyId: project.companyId,
      workProjectId: project.id,
      responsibleProfessionalId: responsible?.id,
      purpose,
      status: 'IN_PROGRESS',
      title: `${project.serviceType} — ${project.company.tradeName ?? project.company.legalName}`,
      scope: 'Caracterizar ambientes, atividades, períodos, agentes, medições e controles, preservando o histórico e a aprovação técnica.',
      referenceDate: new Date(),
      nextReviewAt,
      legalReferences: toPrismaJson(legalReferences),
      limitations: toPrismaJson(['Conclusões dependem de dados válidos, inspeção e aprovação de profissional legalmente habilitado.']),
    },
  });
  if (responsible) await satisfyRequirement(project.id, 'responsible_technical', 'OccupationalTechnicalProfessional', responsible.id);
  await satisfyRequirement(project.id, 'scope', 'OccupationalExposureProgram', program.id);
  return program;
}

export async function saveTechnicalProfessional(input: { tenantId: string; userId?: string | null; name: string; cpf?: string | null; profession: string; councilType: string; councilNumber: string; councilState?: string | null }) {
  const name = input.name.trim();
  const profession = input.profession.trim();
  const councilType = input.councilType.trim().toUpperCase();
  const councilNumber = input.councilNumber.trim().toUpperCase();
  const councilState = input.councilState?.trim().toUpperCase() || null;
  if (name.length < 3 || profession.length < 3 || !councilType || !councilNumber) throw new Error('Nome, profissão e registro profissional são obrigatórios');
  const cpf = input.cpf?.replace(/\D/g, '') ?? '';
  if (cpf && cpf.length !== 11) throw new Error('CPF do responsável técnico inválido');
  return db.occupationalTechnicalProfessional.create({ data: { tenantId: input.tenantId, userId: input.userId ?? null, name, cpfEncrypted: cpf ? encryptSecret(cpf) : null, cpfHash: cpf ? sensitiveHash(cpf) : null, profession, councilType, councilNumber, councilState } });
}

export async function assignExposureResponsible(input: { tenantId: string; workProjectId: string; professionalId: string }) {
  const program = await getOrCreateExposureProgram(input);
  const professional = await db.occupationalTechnicalProfessional.findFirst({ where: { id: input.professionalId, tenantId: input.tenantId, active: true } });
  if (!professional) throw new Error('Responsável técnico não encontrado');
  const updated = await db.occupationalExposureProgram.update({ where: { id: program.id }, data: { responsibleProfessionalId: professional.id } });
  await satisfyRequirement(input.workProjectId, 'responsible_technical', 'OccupationalTechnicalProfessional', professional.id);
  return updated;
}

export async function saveExposurePeriod(input: { tenantId: string; workProjectId: string; workerId?: string | null; establishmentId?: string | null; sectorId?: string | null; gheId?: string | null; jobFunctionId?: string | null; startsAt: Date; endsAt?: Date | null; environmentCode?: string | null; environmentDescription?: string | null; activities: string[]; shift?: string | null; workday?: string | null; userId?: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateExposureProgram(input);
  await validateStructure(project.companyId, input);
  const findings = validateExposurePeriod({ startsAt: input.startsAt, endsAt: input.endsAt });
  if (findings.length) throw new Error(findings.join(' '));
  if (!input.gheId && !input.jobFunctionId && !input.workerId) throw new Error('Vincule o período a trabalhador, GHE ou função');
  if (!input.activities.some((item) => item.trim())) throw new Error('Informe ao menos uma atividade');
  if (input.workerId) {
    const existing = await db.occupationalExposurePeriod.findMany({ where: { exposureProgramId: program.id, workerId: input.workerId, status: { in: ['DRAFT', 'ACTIVE', 'CLOSED'] } }, select: { startsAt: true, endsAt: true } });
    if (existing.some((period) => exposurePeriodsOverlap(period, input))) throw new Error('Existe período ocupacional sobreposto para este trabalhador');
  }
  const row = await db.occupationalExposurePeriod.create({ data: { exposureProgramId: program.id, workerId: input.workerId ?? null, establishmentId: input.establishmentId ?? null, sectorId: input.sectorId ?? null, gheId: input.gheId ?? null, jobFunctionId: input.jobFunctionId ?? null, status: input.endsAt ? 'CLOSED' : 'ACTIVE', startsAt: input.startsAt, endsAt: input.endsAt ?? null, environmentCode: input.environmentCode?.trim() || null, environmentDescription: input.environmentDescription?.trim() || null, activities: toPrismaJson(input.activities.map((item) => item.trim()).filter(Boolean)), shift: input.shift?.trim() || null, workday: input.workday?.trim() || null, createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'exposure_periods', 'OccupationalExposurePeriod', row.id);
  await satisfyRequirement(input.workProjectId, 'assignment_history', 'OccupationalExposurePeriod', row.id);
  return row;
}

export async function saveExposureAgent(input: { tenantId: string; workProjectId: string; exposurePeriodId: string; pgrRiskAssessmentId?: string | null; code: string; category: ExposureAgentCategory; name: string; description?: string | null; esocialCode?: string | null; assessmentMethod: ExposureAssessmentMethod; exposurePattern?: ExposurePattern | string | null; intensity?: number | null; unit?: string | null; toleranceLimit?: number | null; measurementTechnique?: string | null; legalBasis?: string | null; specialRetirementYears?: number | null }) {
  const program = await getOrCreateExposureProgram(input);
  const period = await db.occupationalExposurePeriod.findFirst({ where: { id: input.exposurePeriodId, exposureProgramId: program.id } });
  if (!period) throw new Error('Período de exposição não pertence ao trabalho');
  if (input.assessmentMethod === 'QUANTITATIVE' && input.intensity == null) throw new Error('Agente quantitativo exige resultado ou medição');
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || name.length < 2) throw new Error('Código e nome do agente são obrigatórios');
  if (input.specialRetirementYears && ![15, 20, 25].includes(input.specialRetirementYears)) throw new Error('Tempo especial deve ser 15, 20 ou 25 anos');
  const row = await db.occupationalExposureAgent.create({ data: { exposurePeriodId: period.id, pgrRiskAssessmentId: input.pgrRiskAssessmentId ?? null, code, category: input.category, name, description: input.description?.trim() || null, esocialCode: input.esocialCode?.trim() || null, assessmentMethod: input.assessmentMethod, exposurePattern: normalizeExposurePattern(input.exposurePattern), intensity: input.intensity ?? null, unit: input.unit?.trim() || null, toleranceLimit: input.toleranceLimit ?? null, measurementTechnique: input.measurementTechnique?.trim() || null, legalBasis: input.legalBasis?.trim() || null, specialRetirementYears: input.specialRetirementYears ?? null } });
  await satisfyRequirement(input.workProjectId, 'harmful_agents', 'OccupationalExposureAgent', row.id);
  await satisfyRequirement(input.workProjectId, 'agents', 'OccupationalExposureAgent', row.id);
  return row;
}

export async function saveExposureMeasurement(input: { tenantId: string; workProjectId: string; exposureAgentId: string; measuredAt: Date; result: number; unit: string; methodology: string; technique?: string | null; equipmentName?: string | null; equipmentModel?: string | null; equipmentSerial?: string | null; calibrationCertificate?: string | null; calibrationValidUntil?: Date | null; laboratory?: string | null; uncertainty?: number | null; samplingDurationMinutes?: number | null; notes?: string | null; userId?: string }) {
  const program = await getOrCreateExposureProgram(input);
  const agent = await db.occupationalExposureAgent.findFirst({ where: { id: input.exposureAgentId, exposurePeriod: { exposureProgramId: program.id } } });
  if (!agent) throw new Error('Agente não pertence ao trabalho');
  if (!Number.isFinite(input.result)) throw new Error('Resultado da medição inválido');
  if (!input.unit.trim() || !input.methodology.trim()) throw new Error('Unidade e metodologia são obrigatórias');
  const row = await db.occupationalExposureMeasurement.create({ data: { exposureAgentId: agent.id, measuredAt: input.measuredAt, result: input.result, unit: input.unit.trim(), methodology: input.methodology.trim(), technique: input.technique?.trim() || null, equipmentName: input.equipmentName?.trim() || null, equipmentModel: input.equipmentModel?.trim() || null, equipmentSerial: input.equipmentSerial?.trim() || null, calibrationCertificate: input.calibrationCertificate?.trim() || null, calibrationValidUntil: input.calibrationValidUntil ?? null, laboratory: input.laboratory?.trim() || null, uncertainty: input.uncertainty ?? null, samplingDurationMinutes: input.samplingDurationMinutes ?? null, notes: input.notes?.trim() || null, createdById: input.userId ?? null } });
  await db.occupationalExposureAgent.update({ where: { id: agent.id }, data: { intensity: input.result, unit: input.unit.trim(), measurementTechnique: input.technique?.trim() || input.methodology.trim() } });
  await satisfyRequirement(input.workProjectId, 'measurements', 'OccupationalExposureMeasurement', row.id);
  return row;
}

export async function saveExposureControl(input: { tenantId: string; workProjectId: string; exposureAgentId: string; type: ExposureControlType; description: string; ca?: string | null; effectiveness: ControlEffectiveness; validFrom?: Date | null; validUntil?: Date | null; continuousUse?: boolean | null; trainingRecorded?: boolean | null; maintenanceRecorded?: boolean | null; notes?: string | null; userId?: string }) {
  const program = await getOrCreateExposureProgram(input);
  const agent = await db.occupationalExposureAgent.findFirst({ where: { id: input.exposureAgentId, exposurePeriod: { exposureProgramId: program.id } } });
  if (!agent) throw new Error('Agente não pertence ao trabalho');
  const description = input.description.trim();
  if (description.length < 2) throw new Error('Descrição do controle é obrigatória');
  const assessment = assessProtection([{ type: input.type, effectiveness: input.effectiveness, ca: input.ca, continuousUse: input.continuousUse, trainingRecorded: input.trainingRecorded, maintenanceRecorded: input.maintenanceRecorded, validFrom: input.validFrom, validUntil: input.validUntil }]);
  if (input.effectiveness === 'EFFECTIVE' && assessment.findings.length) throw new Error(assessment.findings.join(' '));
  const row = await db.occupationalExposureControl.create({ data: { exposureAgentId: agent.id, type: input.type, description, ca: input.ca?.trim() || null, effectiveness: input.effectiveness, validFrom: input.validFrom ?? null, validUntil: input.validUntil ?? null, continuousUse: input.continuousUse ?? null, trainingRecorded: input.trainingRecorded ?? null, maintenanceRecorded: input.maintenanceRecorded ?? null, notes: input.notes?.trim() || null, createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'epc_epi', 'OccupationalExposureControl', row.id);
  await satisfyRequirement(input.workProjectId, 'controls', 'OccupationalExposureControl', row.id);
  return row;
}

async function approvedProfessional(tenantId: string, professionalId: string) {
  const professional = await db.occupationalTechnicalProfessional.findFirst({ where: { id: professionalId, tenantId, active: true } });
  if (!professional) throw new Error('Profissional habilitado não encontrado');
  return professional;
}

export async function saveLtcatConclusion(input: { tenantId: string; workProjectId: string; exposurePeriodId?: string | null; conclusion: LtcatExposureConclusion; rationale: string; status?: TechnicalConclusionStatus; professionalId?: string | null }) {
  const program = await getOrCreateExposureProgram(input);
  if (program.purpose !== 'LTCAT') throw new Error('Conclusão previdenciária disponível apenas para LTCAT');
  const status = input.status ?? 'REVIEW';
  const professional = status === 'APPROVED' ? await approvedProfessional(input.tenantId, input.professionalId ?? '') : null;
  const row = await db.ltcatTechnicalConclusion.create({ data: { exposureProgramId: program.id, exposurePeriodId: input.exposurePeriodId ?? null, conclusion: input.conclusion, rationale: input.rationale.trim(), status, approvedById: professional?.id ?? null, approvedAt: professional ? new Date() : null } });
  if (status === 'APPROVED') await satisfyRequirement(input.workProjectId, 'conclusion_by_ghe', 'LtcatTechnicalConclusion', row.id);
  return row;
}

export async function saveInsalubrityAssessment(input: { tenantId: string; workProjectId: string; exposurePeriodId?: string | null; nr15Annex: string; assessmentMethod: ExposureAssessmentMethod; degree: InsalubrityDegree; characterized?: boolean | null; neutralized?: boolean | null; rationale: string; status?: TechnicalConclusionStatus; professionalId?: string | null }) {
  const program = await getOrCreateExposureProgram(input);
  if (program.purpose !== 'INSALUBRIDADE') throw new Error('Avaliação de insalubridade disponível apenas no laudo correspondente');
  if (!nr15Annex(input.nr15Annex)) throw new Error('Anexo da NR-15 não reconhecido no catálogo');
  const status = input.status ?? 'REVIEW';
  const professional = status === 'APPROVED' ? await approvedProfessional(input.tenantId, input.professionalId ?? '') : null;
  const row = await db.insalubrityAssessment.create({ data: { exposureProgramId: program.id, exposurePeriodId: input.exposurePeriodId ?? null, nr15Annex: input.nr15Annex.trim().toUpperCase(), assessmentMethod: input.assessmentMethod, degree: input.degree, characterized: input.characterized ?? null, neutralized: input.neutralized ?? null, rationale: input.rationale.trim(), status, approvedById: professional?.id ?? null, approvedAt: professional ? new Date() : null } });
  if (status === 'APPROVED') await satisfyRequirement(input.workProjectId, 'conclusion_by_function', 'InsalubrityAssessment', row.id);
  return row;
}

export async function saveDangerousAssessment(input: { tenantId: string; workProjectId: string; exposurePeriodId?: string | null; category: DangerousConditionCategory; nr16Annex?: string | null; riskArea?: string | null; exposurePattern?: ExposurePattern | string | null; conclusion: DangerousConclusion; rationale: string; status?: TechnicalConclusionStatus; professionalId?: string | null }) {
  const program = await getOrCreateExposureProgram(input);
  if (program.purpose !== 'PERICULOSIDADE') throw new Error('Avaliação de periculosidade disponível apenas no laudo correspondente');
  if (!nr16Activity(input.category)) throw new Error('Categoria de periculosidade não reconhecida');
  const status = input.status ?? 'REVIEW';
  const professional = status === 'APPROVED' ? await approvedProfessional(input.tenantId, input.professionalId ?? '') : null;
  const row = await db.dangerousConditionAssessment.create({ data: { exposureProgramId: program.id, exposurePeriodId: input.exposurePeriodId ?? null, category: input.category, nr16Annex: input.nr16Annex?.trim() || null, riskArea: input.riskArea?.trim() || null, exposurePattern: normalizeExposurePattern(input.exposurePattern), conclusion: input.conclusion, rationale: input.rationale.trim(), status, approvedById: professional?.id ?? null, approvedAt: professional ? new Date() : null } });
  if (status === 'APPROVED') await satisfyRequirement(input.workProjectId, 'technical_conclusion', 'DangerousConditionAssessment', row.id);
  return row;
}

export async function preparePppDraft(input: { tenantId: string; workProjectId: string; workerId: string; userId?: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateExposureProgram(input);
  if (program.purpose !== 'LTCAT') throw new Error('PPP deve ser preparado a partir de um trabalho LTCAT');
  const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, companyId: project.companyId }, include: { exposurePeriods: { where: { exposureProgramId: program.id, status: { not: 'ARCHIVED' } }, include: { establishment: true, sector: true, ghe: { include: { sector: true } }, jobFunction: true, agents: { include: { measurements: { orderBy: { measuredAt: 'desc' }, take: 1 }, controls: true } }, ltcatConclusions: { where: { status: 'APPROVED' }, include: { approvedBy: true } } }, orderBy: { startsAt: 'asc' } } } });
  if (!worker) throw new Error('Trabalhador não pertence à empresa');
  const periods = worker.exposurePeriods.map((period) => ({ id: period.id, startsAt: period.startsAt, endsAt: period.endsAt, establishment: period.establishment?.name ?? 'Não informado', sector: period.sector?.name ?? period.ghe?.sector.name ?? 'Não informado', jobFunction: period.jobFunction?.name ?? 'Não informada', activities: Array.isArray(period.activities) ? period.activities.filter((item): item is string => typeof item === 'string') : [], agents: period.agents.map((agent) => { const protection = assessProtection(agent.controls); const measurement = agent.measurements[0]; return { code: agent.esocialCode, name: agent.name, intensity: measurement ? Number(measurement.result) : agent.intensity == null ? null : Number(agent.intensity), unit: measurement?.unit ?? agent.unit, technique: measurement?.technique ?? agent.measurementTechnique, epcEffective: protection.epcEffective, epiEffective: protection.epiEffective }; }), responsible: period.ltcatConclusions[0]?.approvedBy ? { name: period.ltcatConclusions[0].approvedBy.name, council: `${period.ltcatConclusions[0].approvedBy.councilType} ${period.ltcatConclusions[0].approvedBy.councilNumber}` } : program.responsibleProfessionalId ? null : null }));
  const responsible = program.responsibleProfessionalId ? await db.occupationalTechnicalProfessional.findUnique({ where: { id: program.responsibleProfessionalId } }) : null;
  for (const period of periods) if (!period.responsible && responsible) period.responsible = { name: responsible.name, council: `${responsible.councilType} ${responsible.councilNumber}` };
  const pppInput = { employer: { legalName: project.company.legalName, cnpj: project.company.cnpj }, worker: { fullName: worker.fullName, cpfMasked: worker.cpfEncrypted ? maskCpf(decryptSecret(worker.cpfEncrypted)) : null, registration: worker.registration, admissionDate: worker.admissionDate }, periods };
  const findings = validatePppInput(pppInput);
  const payload = buildPppSnapshot(pppInput);
  const latest = await db.pppDraft.findFirst({ where: { exposureProgramId: program.id, workerId: worker.id }, orderBy: { revision: 'desc' } });
  const row = await db.pppDraft.create({ data: { exposureProgramId: program.id, workerId: worker.id, revision: (latest?.revision ?? 0) + 1, status: findings.some((finding) => finding.severity === 'ERROR') ? 'DRAFT' : 'READY', payload: toPrismaJson(payload), validationFindings: toPrismaJson(findings), verificationCode: randomToken(16), generatedById: input.userId ?? null, reviewedAt: findings.length ? null : new Date() } });
  if (row.status === 'READY') await satisfyRequirement(input.workProjectId, 'ppp_esocial_data', 'PppDraft', row.id);
  return row;
}

export async function prepareS2240Draft(input: { tenantId: string; workProjectId: string; exposurePeriodId: string; userId?: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateExposureProgram(input);
  if (program.purpose !== 'LTCAT') throw new Error('S-2240 deve ser preparado a partir de um trabalho LTCAT');
  const period = await db.occupationalExposurePeriod.findFirst({ where: { id: input.exposurePeriodId, exposureProgramId: program.id, workerId: { not: null } }, include: { worker: true, establishment: true, sector: true, ghe: { include: { sector: { include: { establishment: true } } } }, jobFunction: true, agents: { include: { measurements: { orderBy: { measuredAt: 'desc' }, take: 1 }, controls: true } } } });
  if (!period?.worker) throw new Error('Período individual de trabalhador não encontrado');
  const responsible = program.responsibleProfessionalId ? await db.occupationalTechnicalProfessional.findUnique({ where: { id: program.responsibleProfessionalId } }) : null;
  if (!responsible?.cpfEncrypted) throw new Error('Responsável técnico precisa possuir CPF para preparar o S-2240');
  if (!period.worker.cpfEncrypted) throw new Error('Trabalhador precisa possuir CPF para preparar o S-2240');
  const environmentName = period.environmentDescription ?? period.sector?.name ?? period.ghe?.sector.name ?? period.establishment?.name ?? 'Ambiente não informado';
  const activities = Array.isArray(period.activities) ? period.activities.filter((item): item is string => typeof item === 'string') : [];
  const agents = period.agents.map((agent) => { const protection = assessProtection(agent.controls); const measurement = agent.measurements[0]; return { code: agent.esocialCode ?? '', description: agent.name, assessmentType: agent.assessmentMethod === 'QUANTITATIVE' ? 'QUANTITATIVE' as const : 'QUALITATIVE' as const, intensity: measurement ? Number(measurement.result) : agent.intensity == null ? null : Number(agent.intensity), unit: measurement?.unit ?? agent.unit, toleranceLimit: agent.toleranceLimit == null ? null : Number(agent.toleranceLimit), measurementTechnique: measurement?.technique ?? agent.measurementTechnique, epcUsed: protection.epcUsed, epcEffective: protection.epcEffective, epiUsed: protection.epiUsed, epiEffective: protection.epiEffective, epis: agent.controls.filter((control) => control.type === 'EPI').map((control) => ({ ca: control.ca, description: control.description, protectionMeasures: control.trainingRecorded ?? false, operatingCondition: control.maintenanceRecorded ?? false, continuousUse: control.continuousUse ?? false, validityObserved: !control.validUntil || control.validUntil >= new Date(), replacementObserved: control.maintenanceRecorded ?? false, hygieneObserved: control.maintenanceRecorded ?? false })) }; });
  const s2240Input = { employerRegistration: project.company.cnpj ?? '', workerCpf: decryptSecret(period.worker.cpfEncrypted), workerRegistration: period.worker.registration, workerCategoryCode: period.worker.categoryCode, startsAt: period.startsAt, environment: { code: period.environmentCode ?? period.gheId ?? period.sectorId ?? 'AMBIENTE', description: environmentName }, activities, agents, responsible: { name: responsible.name, cpf: decryptSecret(responsible.cpfEncrypted), councilType: responsible.councilType, councilNumber: responsible.councilNumber, councilState: responsible.councilState }, processVersion: 'sst-saas-10.6' };
  const findings = validateS2240Input(s2240Input);
  const payload = buildS2240Payload(s2240Input);
  const latest = await db.esocialS2240Draft.findFirst({ where: { exposurePeriodId: period.id, workerId: period.worker.id, version: 'S-1.3' }, orderBy: { revision: 'desc' } });
  const status = findings.some((finding) => finding.severity === 'ERROR') ? 'DRAFT' : 'VALIDATED';
  const row = await db.esocialS2240Draft.create({ data: { exposureProgramId: program.id, exposurePeriodId: period.id, workerId: period.worker.id, version: 'S-1.3', revision: (latest?.revision ?? 0) + 1, status, payload: toPrismaJson(payload), validationFindings: toPrismaJson(findings), generatedById: input.userId ?? null, validatedAt: status === 'VALIDATED' ? new Date() : null } });
  if (status === 'VALIDATED') await satisfyRequirement(input.workProjectId, 'ppp_esocial_data', 'EsocialS2240Draft', row.id);
  return row;
}

export async function getExposureOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const program = await db.occupationalExposureProgram.findUnique({ where: { workProjectId: project.id }, include: { periods: { include: { agents: { include: { measurements: true, controls: true } } } }, ltcatConclusions: true, insalubrityAssessments: true, dangerousAssessments: true, pppDrafts: true, s2240Drafts: true, audits: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  if (!program) return { companyId: project.companyId, purpose: project.serviceType, periodCount: 0, agentCount: 0, measurementCount: 0, controlCount: 0, pendingConclusions: 0, pppReady: 0, s2240Validated: 0, latestAudit: null };
  const agents = program.periods.flatMap((period) => period.agents);
  return { companyId: project.companyId, purpose: program.purpose, periodCount: program.periods.length, agentCount: agents.length, measurementCount: agents.reduce((total, agent) => total + agent.measurements.length, 0), controlCount: agents.reduce((total, agent) => total + agent.controls.length, 0), pendingConclusions: [...program.ltcatConclusions, ...program.insalubrityAssessments, ...program.dangerousAssessments].filter((item) => item.status !== 'APPROVED').length, pppReady: program.pppDrafts.filter((item) => item.status === 'READY' || item.status === 'ISSUED').length, s2240Validated: program.s2240Drafts.filter((item) => item.status === 'VALIDATED' || item.status === 'SENT' || item.status === 'ACCEPTED').length, latestAudit: program.audits[0] ?? null };
}

export async function runExposureAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await exposureProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateExposureProgram(input);
  const details = await db.occupationalExposureProgram.findUniqueOrThrow({ where: { id: program.id }, include: { periods: { include: { agents: { include: { measurements: true, controls: true } } } }, ltcatConclusions: true, insalubrityAssessments: true, dangerousAssessments: true, pppDrafts: true, s2240Drafts: true, workProject: true } });
  const agents = details.periods.flatMap((period) => period.agents);
  const pendingConclusions = details.purpose === 'LTCAT' ? details.ltcatConclusions.filter((item) => item.status !== 'APPROVED').length || (details.periods.length ? 1 : 0) : details.purpose === 'INSALUBRIDADE' ? details.insalubrityAssessments.filter((item) => item.status !== 'APPROVED').length || (details.periods.length ? 1 : 0) : details.purpose === 'PERICULOSIDADE' ? details.dangerousAssessments.filter((item) => item.status !== 'APPROVED').length || (details.periods.length ? 1 : 0) : 0;
  const snapshot = { hasScope: Boolean(details.scope?.trim()), hasResponsibleProfessional: Boolean(details.responsibleProfessionalId), periodCount: details.periods.length, openPeriodCount: details.periods.filter((period) => !period.endsAt).length, periodsWithoutStructure: details.periods.filter((period) => !period.establishmentId || (!period.gheId && !period.jobFunctionId && !period.workerId)).length, agentCount: agents.length, agentsWithoutLegalBasis: agents.filter((agent) => !agent.legalBasis?.trim()).length, quantitativeAgentsWithoutMeasurement: agents.filter((agent) => agent.assessmentMethod === 'QUANTITATIVE' && !agent.measurements.length && agent.intensity == null).length, measurementsWithoutCalibration: agents.flatMap((agent) => agent.measurements).filter((measurement) => !measurement.calibrationCertificate || (measurement.calibrationValidUntil && measurement.calibrationValidUntil < measurement.measuredAt)).length, controlsWithoutEffectiveness: agents.flatMap((agent) => agent.controls).filter((control) => control.effectiveness === 'UNKNOWN').length, pendingTechnicalConclusions: pendingConclusions, pppInvalidCount: details.pppDrafts.filter((draft) => draft.status === 'DRAFT').length, s2240InvalidCount: details.s2240Drafts.filter((draft) => draft.status === 'DRAFT' || draft.status === 'REJECTED').length, workflowProgress: project.progress };
  const result = auditExposureCompleteness(snapshot);
  return db.exposureAuditRun.create({ data: { exposureProgramId: details.id, status: result.status, score: result.score, findings: toPrismaJson(result.findings), snapshot: toPrismaJson(snapshot), createdById: input.userId ?? null } });
}
