import type {
  AsoFitnessResult,
  AsoExamResultStatus,
  MedicalExamKind,
  MedicalProfessionalRole,
  MedicalProviderKind,
  OccupationalExamType,
  PcmsoCallStatus,
} from '@prisma/client';
import { auditPcmsoCompleteness } from '@/domain/pcmso/audit';
import { normalizeCnpj } from '@/domain/company/cnpj';
import { defaultPcmsoExamCatalog } from '@/domain/pcmso/catalog';
import { buildS2220Payload, validateS2220Input } from '@/domain/pcmso/esocial-s2220';
import { isValidCpf, normalizeCouncilState, normalizeCpf } from '@/domain/pcmso/identity';
import { normalizeOccupationalExamTypes, periodicDueDate, requirementAppliesToWorker, requirementsForWorker, shortestPeriodicity, type OccupationalExamTypeValue } from '@/domain/pcmso/matrix';
import { db } from './db';
import { randomToken } from './crypto';
import { decryptSecret, encryptSecret, sensitiveHash } from './secrets';
import { refreshWorkflowStepFromRequirements } from './work-projects';
import { toPrismaJson } from './prisma-json';

const openCallStatuses: PcmsoCallStatus[] = ['DRAFT', 'SCHEDULED', 'NOTIFIED', 'CONFIRMED'];

async function satisfyPcmsoRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

async function pcmsoProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({
    where: { id: workProjectId, tenantId, serviceType: 'PCMSO' },
    include: { company: { select: { id: true, legalName: true, tradeName: true, cnpj: true, employeeCount: true } } },
  });
  if (!project) throw new Error('Trabalho PCMSO não encontrado');
  return project;
}

async function validateWorkerStructure(companyId: string, input: { establishmentId?: string | null; gheId?: string | null; jobFunctionId?: string | null }) {
  if (input.establishmentId) {
    const row = await db.establishment.findFirst({ where: { id: input.establishmentId, companyId, active: true } });
    if (!row) throw new Error('Estabelecimento não pertence à empresa do trabalhador');
  }
  if (input.gheId) {
    const row = await db.gHE.findFirst({ where: { id: input.gheId, active: true, sector: { establishment: { companyId } } } });
    if (!row) throw new Error('GHE não pertence à empresa do trabalhador');
  }
  if (input.jobFunctionId) {
    const row = await db.jobFunction.findFirst({ where: { id: input.jobFunctionId, active: true, ghe: { sector: { establishment: { companyId } } } } });
    if (!row) throw new Error('Função não pertence à empresa do trabalhador');
    if (input.gheId && row.gheId !== input.gheId) throw new Error('Função não pertence ao GHE selecionado');
  }
}

export async function recordMedicalAccess(input: { tenantId: string; workerId?: string | null; userId: string; action: 'VIEW' | 'CREATE' | 'UPDATE' | 'ISSUE' | 'EXPORT' | 'PREPARE_ESOCIAL'; entityType: string; entityId: string; purpose: string; metadata?: unknown }) {
  return db.medicalDataAccessLog.create({ data: { tenantId: input.tenantId, workerId: input.workerId ?? null, userId: input.userId, action: input.action, entityType: input.entityType, entityId: input.entityId, purpose: input.purpose.slice(0, 500), metadata: toPrismaJson(input.metadata, {}) } });
}

export async function getOrCreatePcmsoProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await pcmsoProject(input.tenantId, input.workProjectId);
  const existing = await db.pcmsoProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const pgrProgram = await db.pgrProgram.findFirst({ where: { tenantId: input.tenantId, companyId: project.companyId, status: { in: ['IN_PROGRESS', 'REVIEW', 'APPROVED'] } }, orderBy: { updatedAt: 'desc' } });
  const physician = await db.medicalProfessional.findFirst({ where: { tenantId: input.tenantId, active: true, role: 'RESPONSIBLE_PHYSICIAN' }, orderBy: { updatedAt: 'desc' } });
  const referenceDate = new Date();
  const nextReviewAt = new Date(referenceDate);
  nextReviewAt.setUTCMonth(nextReviewAt.getUTCMonth() + 12);
  const program = await db.pcmsoProgram.create({
    data: {
      tenantId: input.tenantId,
      companyId: project.companyId,
      workProjectId: project.id,
      pgrProgramId: pgrProgram?.id,
      responsiblePhysicianId: physician?.id,
      title: `PCMSO — ${project.company.tradeName ?? project.company.legalName}`,
      scope: 'Proteger e preservar a saúde dos trabalhadores em relação aos riscos ocupacionais identificados e avaliados no gerenciamento de riscos da organização.',
      referenceDate,
      nextReviewAt,
      reviewCycleMonths: 12,
      medicalGuidelines: toPrismaJson(['Planejamento orientado pelos riscos ocupacionais', 'Avaliações clínicas e exames complementares definidos pelo médico responsável', 'Resultados individuais protegidos e relatórios gerenciais agregados']),
      legalReferences: toPrismaJson(['NR-7 — PCMSO', 'NR-1 — GRO/PGR', 'eSocial S-2220 — Monitoramento da Saúde do Trabalhador']),
      status: 'IN_PROGRESS',
    },
  });
  for (const exam of defaultPcmsoExamCatalog) {
    await db.pcmsoExamCatalog.upsert({
      where: { tenantId_code: { tenantId: input.tenantId, code: exam.code } },
      update: { name: exam.name, kind: exam.kind, description: exam.description, active: true },
      create: { tenantId: input.tenantId, code: exam.code, name: exam.name, kind: exam.kind, description: exam.description },
    });
  }
  if (pgrProgram) await satisfyPcmsoRequirement(project.id, 'pgr_reference', 'PgrProgram', pgrProgram.id);
  if (physician) await satisfyPcmsoRequirement(project.id, 'responsible_physician', 'MedicalProfessional', physician.id);
  await satisfyPcmsoRequirement(project.id, 'clinical_protocols', 'PcmsoProgram', program.id);
  return program;
}

export async function saveMedicalProvider(input: { tenantId: string; kind: MedicalProviderKind; name: string; cnpj?: string | null; email?: string | null; phone?: string | null; address?: string | null }) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Nome do prestador é obrigatório');
  const rawCnpj = input.cnpj?.trim() ?? '';
  const cnpj = rawCnpj ? normalizeCnpj(rawCnpj) : null;
  if (rawCnpj && !cnpj) throw new Error('CNPJ do prestador inválido');
  return db.medicalProvider.create({ data: { tenantId: input.tenantId, kind: input.kind, name, cnpj, email: input.email?.trim() || null, phone: input.phone?.trim() || null, address: input.address?.trim() || null } });
}

export async function saveMedicalProfessional(input: { tenantId: string; userId?: string | null; providerId?: string | null; role: MedicalProfessionalRole; name: string; cpf?: string | null; councilType?: string; councilNumber: string; councilState: string; specialty?: string | null }) {
  const name = input.name.trim();
  const councilNumber = input.councilNumber.trim().toUpperCase();
  if (name.length < 3 || !councilNumber) throw new Error('Nome e registro profissional são obrigatórios');
  const councilState = normalizeCouncilState(input.councilState);
  if (input.providerId) {
    const provider = await db.medicalProvider.findFirst({ where: { id: input.providerId, tenantId: input.tenantId, active: true } });
    if (!provider) throw new Error('Prestador médico não pertence à consultoria');
  }
  const cpf = input.cpf ? normalizeCpf(input.cpf) : '';
  if (cpf && !isValidCpf(cpf)) throw new Error('CPF do profissional inválido');
  return db.medicalProfessional.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      providerId: input.providerId ?? null,
      role: input.role,
      name,
      cpfEncrypted: cpf ? encryptSecret(cpf) : null,
      cpfHash: cpf ? sensitiveHash(cpf) : null,
      councilType: (input.councilType || 'CRM').trim().toUpperCase().slice(0, 10),
      councilNumber,
      councilState,
      specialty: input.specialty?.trim() || null,
    },
  });
}

export async function assignResponsiblePhysician(input: { tenantId: string; workProjectId: string; physicianId: string }) {
  const program = await getOrCreatePcmsoProgram(input);
  const physician = await db.medicalProfessional.findFirst({ where: { id: input.physicianId, tenantId: input.tenantId, active: true, role: 'RESPONSIBLE_PHYSICIAN' } });
  if (!physician) throw new Error('Médico responsável não encontrado ou sem perfil compatível');
  const updated = await db.pcmsoProgram.update({ where: { id: program.id }, data: { responsiblePhysicianId: physician.id } });
  await satisfyPcmsoRequirement(input.workProjectId, 'responsible_physician', 'MedicalProfessional', physician.id);
  return updated;
}

export async function saveOccupationalWorker(input: { tenantId: string; workProjectId: string; fullName: string; socialName?: string | null; cpf?: string | null; birthDate?: Date | null; registration?: string | null; categoryCode?: string | null; admissionDate?: Date | null; terminationDate?: Date | null; establishmentId?: string | null; gheId?: string | null; jobFunctionId?: string | null }) {
  const project = await pcmsoProject(input.tenantId, input.workProjectId);
  await validateWorkerStructure(project.companyId, input);
  const fullName = input.fullName.trim();
  if (fullName.length < 3) throw new Error('Nome do trabalhador é obrigatório');
  const cpf = input.cpf ? normalizeCpf(input.cpf) : '';
  if (cpf && !isValidCpf(cpf)) throw new Error('CPF do trabalhador inválido');
  const registration = input.registration?.trim().slice(0, 60) || null;
  if (!cpf && !registration) throw new Error('Informe CPF ou matrícula para identificar o trabalhador');
  const worker = await db.occupationalWorker.create({
    data: {
      tenantId: input.tenantId,
      companyId: project.companyId,
      establishmentId: input.establishmentId ?? null,
      gheId: input.gheId ?? null,
      jobFunctionId: input.jobFunctionId ?? null,
      fullName,
      socialName: input.socialName?.trim() || null,
      cpfEncrypted: cpf ? encryptSecret(cpf) : null,
      cpfHash: cpf ? sensitiveHash(cpf) : null,
      birthDate: input.birthDate ?? null,
      registration,
      categoryCode: input.categoryCode?.trim().slice(0, 3) || null,
      admissionDate: input.admissionDate ?? null,
      terminationDate: input.terminationDate ?? null,
      status: input.terminationDate ? 'TERMINATED' : 'ACTIVE',
    },
  });
  await satisfyPcmsoRequirement(input.workProjectId, 'worker_roster', 'OccupationalWorker', worker.id);
  await satisfyPcmsoRequirement(input.workProjectId, 'active_worker_population', 'OccupationalWorker', worker.id);
  return worker;
}

export async function savePcmsoExamCatalog(input: { tenantId: string; code: string; name: string; kind: MedicalExamKind; esocialProcedureCode?: string | null; description?: string | null }) {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '_').slice(0, 80);
  const name = input.name.trim();
  if (!code || name.length < 3) throw new Error('Código e nome do exame são obrigatórios');
  return db.pcmsoExamCatalog.upsert({
    where: { tenantId_code: { tenantId: input.tenantId, code } },
    update: { name, kind: input.kind, esocialProcedureCode: input.esocialProcedureCode?.trim() || null, description: input.description?.trim() || null, active: true },
    create: { tenantId: input.tenantId, code, name, kind: input.kind, esocialProcedureCode: input.esocialProcedureCode?.trim() || null, description: input.description?.trim() || null },
  });
}

export async function savePcmsoExamRequirement(input: { tenantId: string; workProjectId: string; examCatalogId: string; gheId?: string | null; jobFunctionId?: string | null; pgrRiskAssessmentId?: string | null; occupationalExamTypes: unknown; periodicityMonths?: number | null; triggerDescription?: string | null; mandatory?: boolean; medicalProtocol?: string | null; justification?: string | null; userId?: string }) {
  const program = await getOrCreatePcmsoProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  await validateWorkerStructure(program.companyId, input);
  const catalog = await db.pcmsoExamCatalog.findFirst({ where: { id: input.examCatalogId, tenantId: input.tenantId, active: true } });
  if (!catalog) throw new Error('Exame não pertence ao catálogo da consultoria');
  if (input.pgrRiskAssessmentId) {
    const risk = await db.pgrRiskAssessment.findFirst({ where: { id: input.pgrRiskAssessmentId, pgrProgram: { tenantId: input.tenantId, companyId: program.companyId } } });
    if (!risk) throw new Error('Risco do PGR não pertence à empresa do PCMSO');
  }
  const examTypes = normalizeOccupationalExamTypes(input.occupationalExamTypes);
  if (!examTypes.length) throw new Error('Selecione ao menos um tipo de exame ocupacional');
  const periodicityMonths = examTypes.includes('PERIODIC') ? Number(input.periodicityMonths) : input.periodicityMonths ?? null;
  if (examTypes.includes('PERIODIC') && (!Number.isInteger(periodicityMonths) || Number(periodicityMonths) < 1 || Number(periodicityMonths) > 240)) throw new Error('Periodicidade obrigatória entre 1 e 240 meses para exame periódico');
  const row = await db.pcmsoExamRequirement.create({
    data: {
      pcmsoProgramId: program.id,
      examCatalogId: catalog.id,
      gheId: input.gheId ?? null,
      jobFunctionId: input.jobFunctionId ?? null,
      pgrRiskAssessmentId: input.pgrRiskAssessmentId ?? null,
      occupationalExamTypes: toPrismaJson(examTypes),
      periodicityMonths: periodicityMonths ? Number(periodicityMonths) : null,
      triggerDescription: input.triggerDescription?.trim() || null,
      mandatory: input.mandatory ?? true,
      medicalProtocol: input.medicalProtocol?.trim() || null,
      justification: input.justification?.trim() || null,
      createdById: input.userId,
    },
  });
  await satisfyPcmsoRequirement(input.workProjectId, 'exam_matrix', 'PcmsoExamRequirement', row.id);
  if (periodicityMonths) await satisfyPcmsoRequirement(input.workProjectId, 'periodicities', 'PcmsoExamRequirement', row.id);
  if (input.medicalProtocol) await satisfyPcmsoRequirement(input.workProjectId, 'clinical_protocols', 'PcmsoExamRequirement', row.id);
  return row;
}

export async function generatePcmsoCallups(input: { tenantId: string; workProjectId: string; userId?: string; referenceDate?: Date }) {
  const program = await getOrCreatePcmsoProgram(input);
  const referenceDate = input.referenceDate ?? new Date();
  const [workers, requirements] = await Promise.all([
    db.occupationalWorker.findMany({ where: { tenantId: input.tenantId, companyId: program.companyId, status: 'ACTIVE' } }),
    db.pcmsoExamRequirement.findMany({ where: { pcmsoProgramId: program.id, active: true } }),
  ]);
  let created = 0;
  let uncovered = 0;
  let existing = 0;
  for (const worker of workers) {
    const matched = requirementsForWorker(requirements, worker, 'PERIODIC');
    if (!matched.length) { uncovered += 1; continue; }
    const open = await db.pcmsoCall.findFirst({ where: { pcmsoProgramId: program.id, workerId: worker.id, examType: 'PERIODIC', status: { in: openCallStatuses } } });
    if (open) { existing += 1; continue; }
    const lastAso = await db.occupationalAso.findFirst({ where: { pcmsoProgramId: program.id, workerId: worker.id, status: 'ISSUED' }, orderBy: { asoDate: 'desc' } });
    const dueAt = periodicDueDate({ lastAsoAt: lastAso?.asoDate, admissionDate: worker.admissionDate, referenceDate, periodicityMonths: shortestPeriodicity(matched) });
    await db.pcmsoCall.create({ data: { pcmsoProgramId: program.id, workerId: worker.id, examType: 'PERIODIC', dueAt, status: 'DRAFT', sourceRequirementIds: toPrismaJson(matched.map((item) => item.id)), createdById: input.userId } });
    created += 1;
  }
  if (created || existing) await satisfyPcmsoRequirement(input.workProjectId, 'callup_schedule', 'PcmsoCall', program.id);
  return { programId: program.id, workers: workers.length, created, existing, uncovered };
}

export async function createOccupationalAso(input: {
  tenantId: string;
  workProjectId: string;
  workerId: string;
  callId?: string | null;
  issuingPhysicianId: string;
  examType: OccupationalExamType;
  asoDate: Date;
  fitnessResult: AsoFitnessResult;
  restrictions?: string | null;
  physicianNotes?: string | null;
  exams: Array<{ examCatalogId: string; performedAt: Date; resultStatus: AsoExamResultStatus; result?: string | null; procedureCode?: string | null }>;
  userId: string;
}) {
  const program = await getOrCreatePcmsoProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: program.companyId } });
  if (!worker) throw new Error('Trabalhador não pertence à empresa do PCMSO');
  const physician = await db.medicalProfessional.findFirst({ where: { id: input.issuingPhysicianId, tenantId: input.tenantId, active: true, role: { in: ['RESPONSIBLE_PHYSICIAN', 'EXAMINING_PHYSICIAN'] } } });
  if (!physician) throw new Error('Médico emitente não encontrado ou sem perfil compatível');
  if (input.fitnessResult === 'PENDING') throw new Error('Aptidão deve ser concluída antes da emissão do ASO');
  if (!input.exams.length) throw new Error('Informe ao menos uma avaliação clínica ou exame complementar');
  const catalogIds = [...new Set(input.exams.map((item) => item.examCatalogId))];
  const catalogs = await db.pcmsoExamCatalog.findMany({ where: { tenantId: input.tenantId, id: { in: catalogIds }, active: true } });
  if (catalogs.length !== catalogIds.length) throw new Error('Um ou mais exames não pertencem ao catálogo da consultoria');
  if (input.callId) {
    const call = await db.pcmsoCall.findFirst({ where: { id: input.callId, pcmsoProgramId: program.id, workerId: worker.id } });
    if (!call) throw new Error('Convocação não pertence ao trabalhador e PCMSO informados');
  }
  const pgrRisks = worker.gheId ? await db.pgrRiskAssessment.findMany({ where: { gheId: worker.gheId, pgrProgram: { companyId: program.companyId } }, select: { hazard: true, category: true }, take: 50 }) : [];
  const status = 'ISSUED' as const;
  const aso = await db.$transaction(async (tx) => {
    const created = await tx.occupationalAso.create({
      data: {
        pcmsoProgramId: program.id,
        workerId: worker.id,
        callId: input.callId ?? null,
        issuingPhysicianId: physician.id,
        examType: input.examType,
        status,
        asoDate: input.asoDate,
        fitnessResult: input.fitnessResult,
        restrictionsEncrypted: input.restrictions?.trim() ? encryptSecret(input.restrictions.trim()) : null,
        physicianNotesEncrypted: input.physicianNotes?.trim() ? encryptSecret(input.physicianNotes.trim()) : null,
        riskDescriptions: toPrismaJson(pgrRisks.map((risk) => `${risk.category}: ${risk.hazard}`)),
        verificationCode: randomToken(18),
        issuedAt: new Date(),
      },
    });
    await tx.occupationalAsoExam.createMany({ data: input.exams.map((exam, index) => ({ asoId: created.id, examCatalogId: exam.examCatalogId, performedAt: exam.performedAt, resultStatus: exam.resultStatus, resultEncrypted: exam.result?.trim() ? encryptSecret(exam.result.trim()) : null, procedureCode: exam.procedureCode?.trim() || catalogs.find((item) => item.id === exam.examCatalogId)?.esocialProcedureCode || null, orderIndex: index })) });
    if (input.callId) await tx.pcmsoCall.update({ where: { id: input.callId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    return created;
  });
  await satisfyPcmsoRequirement(input.workProjectId, 'health_monitoring', 'OccupationalAso', aso.id);
  await satisfyPcmsoRequirement(input.workProjectId, 'aso_tracking', 'OccupationalAso', aso.id);
  await recordMedicalAccess({ tenantId: input.tenantId, workerId: worker.id, userId: input.userId, action: 'ISSUE', entityType: 'OccupationalAso', entityId: aso.id, purpose: 'Emissão de ASO ocupacional', metadata: { examType: input.examType, fitnessResult: input.fitnessResult } });
  return aso;
}

export async function prepareS2220Draft(input: { tenantId: string; workProjectId: string; asoId: string; userId: string }) {
  const project = await pcmsoProject(input.tenantId, input.workProjectId);
  const aso = await db.occupationalAso.findFirst({
    where: { id: input.asoId, pcmsoProgram: { workProjectId: project.id, tenantId: input.tenantId } },
    include: {
      worker: true,
      issuingPhysician: true,
      exams: { include: { examCatalog: true }, orderBy: { orderIndex: 'asc' } },
      pcmsoProgram: { include: { company: true, responsiblePhysician: true } },
      esocialDrafts: { orderBy: { revision: 'desc' }, take: 1 },
    },
  });
  if (!aso || aso.status !== 'ISSUED') throw new Error('ASO emitido não encontrado');
  if (!aso.worker.cpfEncrypted) throw new Error('CPF do trabalhador não cadastrado');
  if (!aso.issuingPhysician.cpfEncrypted) throw new Error('CPF do médico emitente não cadastrado');
  const responsible = aso.pcmsoProgram.responsiblePhysician;
  const s2220Input = {
    employerRegistration: aso.pcmsoProgram.company.cnpj ?? '',
    workerCpf: decryptSecret(aso.worker.cpfEncrypted),
    workerRegistration: aso.worker.registration,
    workerCategoryCode: aso.worker.categoryCode,
    examType: aso.examType as OccupationalExamTypeValue,
    asoDate: aso.asoDate,
    fitnessResult: aso.fitnessResult,
    exams: aso.exams.map((exam) => ({ performedAt: exam.performedAt, procedureCode: exam.procedureCode ?? exam.examCatalog.esocialProcedureCode, resultStatus: exam.resultStatus })),
    physician: { name: aso.issuingPhysician.name, cpf: decryptSecret(aso.issuingPhysician.cpfEncrypted), councilNumber: aso.issuingPhysician.councilNumber, councilState: aso.issuingPhysician.councilState },
    responsiblePhysician: responsible?.cpfEncrypted ? { name: responsible.name, cpf: decryptSecret(responsible.cpfEncrypted), councilNumber: responsible.councilNumber, councilState: responsible.councilState } : null,
    processVersion: 'sst-saas-1.2.0-checkpoint.10.5',
  };
  const findings = validateS2220Input(s2220Input);
  const payload = buildS2220Payload(s2220Input);
  const revision = (aso.esocialDrafts[0]?.revision ?? 0) + 1;
  const status = findings.some((finding) => finding.severity === 'ERROR') ? 'DRAFT' : 'VALIDATED';
  const draft = await db.esocialS2220Draft.create({ data: { asoId: aso.id, version: 'S-1.3', revision, status, payload: toPrismaJson(payload), validationFindings: toPrismaJson(findings), generatedById: input.userId, validatedAt: status === 'VALIDATED' ? new Date() : null } });
  if (status === 'VALIDATED') await satisfyPcmsoRequirement(input.workProjectId, 's2220_preparation', 'EsocialS2220Draft', draft.id);
  await recordMedicalAccess({ tenantId: input.tenantId, workerId: aso.workerId, userId: input.userId, action: 'PREPARE_ESOCIAL', entityType: 'EsocialS2220Draft', entityId: draft.id, purpose: 'Preparação e validação do evento S-2220', metadata: { status, revision } });
  return draft;
}

export async function generatePcmsoAnalyticalReport(input: { tenantId: string; workProjectId: string; periodStart: Date; periodEnd: Date; userId?: string }) {
  const program = await getOrCreatePcmsoProgram(input);
  if (input.periodEnd < input.periodStart) throw new Error('Período do relatório analítico inválido');
  const [populationCount, asos] = await Promise.all([
    db.occupationalWorker.count({ where: { tenantId: input.tenantId, companyId: program.companyId, status: 'ACTIVE' } }),
    db.occupationalAso.findMany({ where: { pcmsoProgramId: program.id, status: 'ISSUED', asoDate: { gte: input.periodStart, lte: input.periodEnd } }, include: { exams: { select: { resultStatus: true } } } }),
  ]);
  const examCount = asos.reduce((sum, aso) => sum + aso.exams.length, 0);
  const abnormalExamCount = asos.reduce((sum, aso) => sum + aso.exams.filter((exam) => exam.resultStatus === 'ALTERED').length, 0);
  const examTypeCounts = Object.fromEntries(['ADMISSION', 'PERIODIC', 'RETURN_TO_WORK', 'RISK_CHANGE', 'POINT_MONITORING', 'TERMINATION'].map((type) => [type, asos.filter((aso) => aso.examType === type).length]));
  const fitnessCounts = Object.fromEntries(['FIT', 'FIT_WITH_RESTRICTIONS', 'UNFIT'].map((result) => [result, asos.filter((aso) => aso.fitnessResult === result).length]));
  const recommendations = abnormalExamCount ? ['Analisar os resultados agregados em conjunto com os riscos do PGR e avaliar necessidade de revisão das medidas preventivas.'] : ['Manter acompanhamento do programa e revisão periódica da matriz de exames conforme mudanças nos riscos ocupacionais.'];
  const report = await db.pcmsoAnalyticalReport.upsert({
    where: { pcmsoProgramId_periodStart_periodEnd: { pcmsoProgramId: program.id, periodStart: input.periodStart, periodEnd: input.periodEnd } },
    update: { populationCount, examCount, abnormalExamCount, aggregatedResults: toPrismaJson({ examTypeCounts, fitnessCounts }), analysis: `Foram emitidos ${asos.length} ASO(s) e realizados ${examCount} exame(s) no período. Os resultados são apresentados exclusivamente de forma agregada.`, recommendations: toPrismaJson(recommendations), limitations: toPrismaJson(['Relatório gerencial agregado; não substitui avaliação clínica individual nem expõe diagnósticos.']), status: 'REVIEW' },
    create: { pcmsoProgramId: program.id, periodStart: input.periodStart, periodEnd: input.periodEnd, populationCount, examCount, abnormalExamCount, aggregatedResults: toPrismaJson({ examTypeCounts, fitnessCounts }), analysis: `Foram emitidos ${asos.length} ASO(s) e realizados ${examCount} exame(s) no período. Os resultados são apresentados exclusivamente de forma agregada.`, recommendations: toPrismaJson(recommendations), limitations: toPrismaJson(['Relatório gerencial agregado; não substitui avaliação clínica individual nem expõe diagnósticos.']), status: 'REVIEW' },
  });
  await satisfyPcmsoRequirement(input.workProjectId, 'aggregated_indicators', 'PcmsoAnalyticalReport', report.id);
  await satisfyPcmsoRequirement(input.workProjectId, 'analysis', 'PcmsoAnalyticalReport', report.id);
  await satisfyPcmsoRequirement(input.workProjectId, 'recommendations', 'PcmsoAnalyticalReport', report.id);
  return report;
}

export async function runPcmsoAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const program = await getOrCreatePcmsoProgram(input);
  const now = new Date();
  const [workers, requirements, calls, asos, reports] = await Promise.all([
    db.occupationalWorker.findMany({ where: { tenantId: input.tenantId, companyId: program.companyId, status: 'ACTIVE' }, select: { id: true, gheId: true, jobFunctionId: true } }),
    db.pcmsoExamRequirement.findMany({ where: { pcmsoProgramId: program.id, active: true } }),
    db.pcmsoCall.findMany({ where: { pcmsoProgramId: program.id } }),
    db.occupationalAso.findMany({ where: { pcmsoProgramId: program.id, status: { not: 'CANCELLED' } }, include: { _count: { select: { exams: true } }, esocialDrafts: { orderBy: { revision: 'desc' }, take: 1 } } }),
    db.pcmsoAnalyticalReport.findMany({ where: { pcmsoProgramId: program.id } }),
  ]);
  const workersWithoutMatrixCoverage = workers.filter((worker) => !requirements.some((requirement) => requirementAppliesToWorker(requirement, worker))).length;
  const latestDrafts = asos.map((aso) => aso.esocialDrafts[0]).filter(Boolean);
  const auditResult = auditPcmsoCompleteness({
    hasScope: Boolean(program.scope?.trim()),
    hasResponsiblePhysician: Boolean(program.responsiblePhysicianId),
    hasPgrReference: Boolean(program.pgrProgramId),
    activeWorkerCount: workers.length,
    examCatalogCount: await db.pcmsoExamCatalog.count({ where: { tenantId: input.tenantId, active: true } }),
    examRequirementCount: requirements.length,
    workersWithoutMatrixCoverage,
    overdueCallCount: calls.filter((call) => openCallStatuses.includes(call.status) && call.dueAt < now).length,
    callsMissingProvider: calls.filter((call) => ['SCHEDULED', 'NOTIFIED', 'CONFIRMED'].includes(call.status) && !call.providerId).length,
    issuedAsoCount: asos.filter((aso) => aso.status === 'ISSUED').length,
    asosPendingFitness: asos.filter((aso) => aso.fitnessResult === 'PENDING').length,
    asosWithoutExams: asos.filter((aso) => aso._count.exams === 0).length,
    s2220ReadyCount: latestDrafts.filter((draft) => draft?.status === 'VALIDATED' || draft?.status === 'READY' || draft?.status === 'ACCEPTED').length,
    s2220InvalidCount: latestDrafts.filter((draft) => draft?.status === 'DRAFT' || draft?.status === 'REJECTED').length,
    analyticalReportCount: reports.length,
    workflowProgress: (await db.workProject.findUnique({ where: { id: input.workProjectId }, select: { progress: true } }))?.progress ?? 0,
  });
  const run = await db.pcmsoAuditRun.create({ data: { pcmsoProgramId: program.id, status: auditResult.status, score: auditResult.score, findings: toPrismaJson(auditResult.findings), snapshot: toPrismaJson({ workers: workers.length, requirements: requirements.length, calls: calls.length, asos: asos.length, reports: reports.length }), createdById: input.userId } });
  if (auditResult.status !== 'FAILED') await satisfyPcmsoRequirement(input.workProjectId, 'technical_audit', 'PcmsoAuditRun', run.id);
  return run;
}

export async function getPcmsoOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await pcmsoProject(input.tenantId, input.workProjectId);
  const program = await db.pcmsoProgram.findUnique({
    where: { workProjectId: project.id },
    include: {
      _count: { select: { examRequirements: true, calls: true, asos: true, analyticalReports: true } },
      calls: { where: { status: { in: openCallStatuses } }, select: { dueAt: true, status: true } },
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  const activeWorkers = await db.occupationalWorker.count({ where: { tenantId: input.tenantId, companyId: project.companyId, status: 'ACTIVE' } });
  if (!program) return { programId: null, companyId: project.companyId, activeWorkers, examRequirements: 0, calls: 0, overdueCalls: 0, asos: 0, reports: 0, latestAudit: null };
  return { programId: program.id, companyId: project.companyId, status: program.status, activeWorkers, examRequirements: program._count.examRequirements, calls: program._count.calls, overdueCalls: program.calls.filter((call) => call.dueAt < new Date()).length, asos: program._count.asos, reports: program._count.analyticalReports, latestAudit: program.audits[0] ?? null };
}
