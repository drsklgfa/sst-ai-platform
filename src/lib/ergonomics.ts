import type {
  AepConclusion,
  ErgonomicAssessmentStage,
  ErgonomicDemandSource,
  ErgonomicMethodType,
  ErgonomicWorkDimension,
  TechnicalConclusionStatus,
  WorkerParticipationKind,
} from '@prisma/client';
import { auditErgonomicsCompleteness } from '@/domain/ergonomics/audit';
import { calculateErgonomicMethod } from '@/domain/ergonomics/assessment';
import { calculateRisk } from '@/domain/engines/risk-matrix';
import { db } from './db';
import { toPrismaJson } from './prisma-json';
import { refreshWorkflowStepFromRequirements } from './work-projects';

const supportedServices = ['AET', 'AEP'];

async function satisfyRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

async function ergonomicsProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({
    where: { id: workProjectId, tenantId, serviceType: { in: supportedServices } },
    include: { company: { select: { id: true, legalName: true, tradeName: true } } },
  });
  if (!project) throw new Error('Trabalho de ergonomia não encontrado');
  return project;
}

async function validateStructure(companyId: string, input: { establishmentId?: string | null; sectorId?: string | null; gheId?: string | null; jobFunctionId?: string | null; workstationId?: string | null; inspectionId?: string | null }) {
  if (input.establishmentId) {
    const row = await db.establishment.findFirst({ where: { id: input.establishmentId, companyId, active: true } });
    if (!row) throw new Error('Estabelecimento não pertence à empresa');
  }
  if (input.sectorId) {
    const row = await db.sector.findFirst({ where: { id: input.sectorId, active: true, establishment: { companyId } } });
    if (!row) throw new Error('Setor não pertence à empresa');
  }
  if (input.gheId) {
    const row = await db.gHE.findFirst({ where: { id: input.gheId, active: true, sector: { establishment: { companyId } } } });
    if (!row) throw new Error('GHE não pertence à empresa');
  }
  if (input.jobFunctionId) {
    const row = await db.jobFunction.findFirst({ where: { id: input.jobFunctionId, active: true, ghe: { sector: { establishment: { companyId } } } } });
    if (!row) throw new Error('Função não pertence à empresa');
  }
  if (input.workstationId) {
    const row = await db.workstation.findFirst({ where: { id: input.workstationId, active: true, ghe: { sector: { establishment: { companyId } } } } });
    if (!row) throw new Error('Posto não pertence à empresa');
  }
  if (input.inspectionId) {
    const row = await db.inspection.findFirst({ where: { id: input.inspectionId, companyId } });
    if (!row) throw new Error('Vistoria não pertence à empresa');
  }
}

export async function getOrCreateErgonomicsProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const existing = await db.ergonomicsProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const program = await db.ergonomicsProgram.create({
    data: {
      tenantId: input.tenantId,
      companyId: project.companyId,
      workProjectId: project.id,
      title: `AEP/AET — ${project.company.tradeName ?? project.company.legalName}`,
      status: 'IN_PROGRESS',
      stage: 'AEP',
      scope: 'Avaliar situações reais de trabalho, identificar fatores ergonômicos e orientar medidas de prevenção com participação dos trabalhadores.',
      responsibleUserId: input.userId,
      methodology: toPrismaJson({ approach: 'ergonomia_da_atividade', stages: ['AEP', 'AET quando necessária'], calculations: ['RULA', 'REBA', 'NIOSH'] }),
      legalReferences: toPrismaJson(['NR-17 — Ergonomia', 'NR-1 — GRO/PGR', 'métodos técnicos selecionados conforme aplicabilidade']),
      limitations: toPrismaJson(['Métodos observacionais não substituem análise da atividade real.', 'Fotos e vídeos não fornecem medidas exatas sem dados objetivos.', 'Conclusões dependem de revisão profissional.']),
    },
  });
  await satisfyRequirement(project.id, 'aep_scope', 'ErgonomicsProgram', program.id);
  await satisfyRequirement(project.id, 'method_limitations', 'ErgonomicsProgram', program.id);
  await satisfyRequirement(project.id, 'limitations', 'ErgonomicsProgram', program.id);
  return program;
}

export async function saveErgonomicDemand(input: { tenantId: string; workProjectId: string; source: ErgonomicDemandSource; title: string; description: string; triggerDate?: Date | null; sourceType?: string | null; sourceId?: string | null; sourcePage?: number | null; confidence?: number | null; userId?: string }) {
  const program = await getOrCreateErgonomicsProgram(input);
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || description.length < 10) throw new Error('Título e descrição detalhada da demanda são obrigatórios');
  const row = await db.ergonomicDemand.create({ data: { ergonomicsProgramId: program.id, source: input.source, title, description, triggerDate: input.triggerDate ?? null, sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, sourcePage: input.sourcePage ?? null, confidence: input.confidence ?? null, createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'demand', 'ErgonomicDemand', row.id);
  if (['WORKER', 'HEALTH_SURVEILLANCE', 'CIPA'].includes(row.source)) await satisfyRequirement(input.workProjectId, 'worker_complaints', 'ErgonomicDemand', row.id);
  return row;
}

export async function saveErgonomicWorkSituation(input: {
  tenantId: string; workProjectId: string; title: string;
  establishmentId?: string | null; sectorId?: string | null; gheId?: string | null; jobFunctionId?: string | null; workstationId?: string | null; inspectionId?: string | null;
  prescribedWork?: string | null; actualWork?: string | null; activities?: string[]; variability?: string[]; strategies?: string[]; constraints?: string[];
  workOrganization?: Record<string, unknown>; cognitiveDemands?: Record<string, unknown>; psychosocialFactors?: Record<string, unknown>; environmentalConditions?: Record<string, unknown>; population?: Record<string, unknown>;
  shift?: string | null; taskDurationMinutes?: number | null; cyclesPerHour?: number | null; breaks?: string | null; notes?: string | null;
  sourceType?: string | null; sourceId?: string | null; sourcePage?: number | null; confidence?: number | null; userId?: string;
}) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateErgonomicsProgram(input);
  await validateStructure(project.companyId, input);
  const title = input.title.trim();
  if (title.length < 3) throw new Error('Título da situação de trabalho é obrigatório');
  if (!input.prescribedWork?.trim() && !input.actualWork?.trim()) throw new Error('Descreva o trabalho prescrito ou o trabalho real');
  const row = await db.ergonomicWorkSituation.create({
    data: {
      ergonomicsProgramId: program.id,
      establishmentId: input.establishmentId ?? null,
      sectorId: input.sectorId ?? null,
      gheId: input.gheId ?? null,
      jobFunctionId: input.jobFunctionId ?? null,
      workstationId: input.workstationId ?? null,
      inspectionId: input.inspectionId ?? null,
      title,
      prescribedWork: input.prescribedWork?.trim() || null,
      actualWork: input.actualWork?.trim() || null,
      activities: toPrismaJson(input.activities ?? []),
      variability: toPrismaJson(input.variability ?? []),
      strategies: toPrismaJson(input.strategies ?? []),
      constraints: toPrismaJson(input.constraints ?? []),
      workOrganization: toPrismaJson(input.workOrganization ?? {}),
      cognitiveDemands: toPrismaJson(input.cognitiveDemands ?? {}),
      psychosocialFactors: toPrismaJson(input.psychosocialFactors ?? {}),
      environmentalConditions: toPrismaJson(input.environmentalConditions ?? {}),
      population: toPrismaJson(input.population ?? {}),
      shift: input.shift?.trim() || null,
      taskDurationMinutes: input.taskDurationMinutes ?? null,
      cyclesPerHour: input.cyclesPerHour ?? null,
      breaks: input.breaks?.trim() || null,
      notes: input.notes?.trim() || null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      sourcePage: input.sourcePage ?? null,
      confidence: input.confidence ?? null,
      createdById: input.userId ?? null,
    },
  });
  await satisfyRequirement(input.workProjectId, 'work_situations', 'ErgonomicWorkSituation', row.id);
  if (row.prescribedWork && row.actualWork) await satisfyRequirement(input.workProjectId, 'prescribed_real_work', 'ErgonomicWorkSituation', row.id);
  if ((input.variability?.length ?? 0) || (input.strategies?.length ?? 0)) await satisfyRequirement(input.workProjectId, 'variability_strategies', 'ErgonomicWorkSituation', row.id);
  if (row.taskDurationMinutes || row.breaks || Object.keys(input.population ?? {}).length) await satisfyRequirement(input.workProjectId, 'population_journey', 'ErgonomicWorkSituation', row.id);
  if (Object.keys(input.workOrganization ?? {}).length) await satisfyRequirement(input.workProjectId, 'work_organization', 'ErgonomicWorkSituation', row.id);
  if (Object.keys(input.cognitiveDemands ?? {}).length) await satisfyRequirement(input.workProjectId, 'cognitive', 'ErgonomicWorkSituation', row.id);
  if (Object.keys(input.psychosocialFactors ?? {}).length) await satisfyRequirement(input.workProjectId, 'psychosocial', 'ErgonomicWorkSituation', row.id);
  if (Object.keys(input.environmentalConditions ?? {}).length) await satisfyRequirement(input.workProjectId, 'environmental_conditions', 'ErgonomicWorkSituation', row.id);
  return row;
}

export async function registerErgonomicParticipation(input: { tenantId: string; workProjectId: string; workSituationId?: string | null; kind: WorkerParticipationKind; title: string; participantCount?: number; groups?: string[]; summary?: string | null; outcomes?: string[]; confidential?: boolean; sourceType?: string | null; sourceId?: string | null; userId?: string }) {
  const program = await getOrCreateErgonomicsProgram(input);
  if (input.workSituationId) {
    const situation = await db.ergonomicWorkSituation.findFirst({ where: { id: input.workSituationId, ergonomicsProgramId: program.id } });
    if (!situation) throw new Error('Situação de trabalho não pertence ao programa');
  }
  const title = input.title.trim();
  if (title.length < 3) throw new Error('Título da participação é obrigatório');
  const row = await db.ergonomicParticipation.create({ data: { ergonomicsProgramId: program.id, workSituationId: input.workSituationId ?? null, kind: input.kind, title, participantCount: Math.max(0, input.participantCount ?? 0), groups: toPrismaJson(input.groups ?? []), summary: input.summary?.trim() || null, outcomes: toPrismaJson(input.outcomes ?? []), confidential: input.confidential ?? false, sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'worker_participation_records', 'ErgonomicParticipation', row.id);
  if ((input.outcomes?.length ?? 0) > 0) await satisfyRequirement(input.workProjectId, 'collective_feedback', 'ErgonomicParticipation', row.id);
  await satisfyRequirement(input.workProjectId, 'privacy', 'ErgonomicParticipation', row.id);
  await satisfyRequirement(input.workProjectId, 'interviews', 'ErgonomicParticipation', row.id);
  return row;
}

export async function saveErgonomicAssessment(input: { tenantId: string; workProjectId: string; workSituationId: string; method: ErgonomicMethodType; stage?: ErgonomicAssessmentStage; applicability: string; inputs: Record<string, unknown>; manualOutput?: Record<string, unknown>; manualScore?: number | null; manualClassification?: string | null; sourceType?: string | null; sourceId?: string | null; sourcePage?: number | null; confidence?: number | null; userId?: string }) {
  const program = await getOrCreateErgonomicsProgram(input);
  const situation = await db.ergonomicWorkSituation.findFirst({ where: { id: input.workSituationId, ergonomicsProgramId: program.id } });
  if (!situation) throw new Error('Situação de trabalho não pertence ao programa');
  if (input.applicability.trim().length < 10) throw new Error('Justifique a aplicabilidade do método');
  const result = calculateErgonomicMethod(input.method, input.inputs);
  const output = result.calculated ? result.output : (input.manualOutput ?? {});
  const score = result.calculated ? result.score : (input.manualScore ?? null);
  const classification = result.calculated ? result.classification : (input.manualClassification?.trim() || null);
  const row = await db.ergonomicAssessment.create({ data: { ergonomicsProgramId: program.id, workSituationId: situation.id, method: input.method, stage: input.stage ?? 'AET', status: result.calculated ? 'CALCULATED' : 'REVIEW', applicability: input.applicability.trim(), inputs: toPrismaJson(input.inputs), outputs: toPrismaJson(output), score, classification, engineVersion: result.engineVersion, limitations: toPrismaJson(result.limitations), sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, sourcePage: input.sourcePage ?? null, confidence: input.confidence ?? null, createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'method_selection', 'ErgonomicAssessment', row.id);
  await satisfyRequirement(input.workProjectId, 'biomechanics', 'ErgonomicAssessment', row.id);
  if (result.calculated) await satisfyRequirement(input.workProjectId, 'deterministic_calculations', 'ErgonomicAssessment', row.id);
  return row;
}

export async function reviewErgonomicAssessment(input: { tenantId: string; workProjectId: string; assessmentId: string; approved: boolean; userId: string }) {
  const program = await getOrCreateErgonomicsProgram(input);
  const assessment = await db.ergonomicAssessment.findFirst({ where: { id: input.assessmentId, ergonomicsProgramId: program.id } });
  if (!assessment) throw new Error('Avaliação ergonômica não encontrada');
  const row = await db.ergonomicAssessment.update({ where: { id: assessment.id }, data: { status: input.approved ? 'APPROVED' : 'REJECTED', reviewedById: input.userId, reviewedAt: new Date() } });
  if (input.approved) await satisfyRequirement(input.workProjectId, 'method_professional_review', 'ErgonomicAssessment', row.id);
  return row;
}

export async function saveErgonomicFinding(input: { tenantId: string; workProjectId: string; workSituationId?: string | null; assessmentId?: string | null; dimension: ErgonomicWorkDimension; code: string; title: string; description: string; evidence?: unknown[]; severity: number; probability: number; exposure?: number; recommendation?: string | null; sourceType?: string | null; sourceId?: string | null; sourcePage?: number | null; confidence?: number | null; userId?: string }) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateErgonomicsProgram(input);
  if (input.workSituationId) {
    const row = await db.ergonomicWorkSituation.findFirst({ where: { id: input.workSituationId, ergonomicsProgramId: program.id } });
    if (!row) throw new Error('Situação de trabalho não pertence ao programa');
  }
  if (input.assessmentId) {
    const row = await db.ergonomicAssessment.findFirst({ where: { id: input.assessmentId, ergonomicsProgramId: program.id } });
    if (!row) throw new Error('Avaliação não pertence ao programa');
  }
  const code = input.code.trim().toUpperCase();
  const title = input.title.trim();
  const description = input.description.trim();
  if (!code || title.length < 3 || description.length < 10) throw new Error('Código, título e descrição do achado são obrigatórios');
  const risk = calculateRisk(input.severity, input.probability, input.exposure ?? 1);
  const canonical = await db.risk.upsert({
    where: { companyId_code: { companyId: project.companyId, code: `ERG-${code}` } },
    update: { category: 'ERGONOMIC', hazard: title, source: description, possibleHarm: description, severity: input.severity, probability: input.probability, exposure: input.exposure ?? 1, initialScore: risk.score, initialLevel: risk.level, assessmentBasis: toPrismaJson({ source: 'ErgonomicFinding', workProjectId: input.workProjectId, workSituationId: input.workSituationId, assessmentId: input.assessmentId }) },
    create: { companyId: project.companyId, code: `ERG-${code}`, category: 'ERGONOMIC', hazard: title, source: description, possibleHarm: description, severity: input.severity, probability: input.probability, exposure: input.exposure ?? 1, initialScore: risk.score, initialLevel: risk.level, assessmentBasis: toPrismaJson({ source: 'ErgonomicFinding', workProjectId: input.workProjectId, workSituationId: input.workSituationId, assessmentId: input.assessmentId }) },
  });
  const row = await db.ergonomicFinding.upsert({
    where: { ergonomicsProgramId_code: { ergonomicsProgramId: program.id, code } },
    update: { workSituationId: input.workSituationId ?? null, assessmentId: input.assessmentId ?? null, dimension: input.dimension, title, description, evidence: toPrismaJson(input.evidence ?? []), severity: input.severity, probability: input.probability, score: risk.score, level: risk.level, recommendation: input.recommendation?.trim() || null, riskId: canonical.id, sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, sourcePage: input.sourcePage ?? null, confidence: input.confidence ?? null, reviewedById: input.userId ?? null, reviewedAt: input.userId ? new Date() : null },
    create: { ergonomicsProgramId: program.id, workSituationId: input.workSituationId ?? null, assessmentId: input.assessmentId ?? null, dimension: input.dimension, code, title, description, evidence: toPrismaJson(input.evidence ?? []), severity: input.severity, probability: input.probability, score: risk.score, level: risk.level, recommendation: input.recommendation?.trim() || null, riskId: canonical.id, sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, sourcePage: input.sourcePage ?? null, confidence: input.confidence ?? null, reviewedById: input.userId ?? null, reviewedAt: input.userId ? new Date() : null },
  });
  await satisfyRequirement(input.workProjectId, 'results', 'ErgonomicFinding', row.id);
  await satisfyRequirement(input.workProjectId, 'technical_diagnosis', 'ErgonomicFinding', row.id);
  await satisfyRequirement(input.workProjectId, 'risk_integration', 'Risk', canonical.id);
  if (row.recommendation) await satisfyRequirement(input.workProjectId, 'recommendations', 'ErgonomicFinding', row.id);
  return row;
}

export async function generateErgonomicActionPlan(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateErgonomicsProgram(input);
  const findings = await db.ergonomicFinding.findMany({ where: { ergonomicsProgramId: program.id, level: { in: ['MODERATE', 'HIGH', 'CRITICAL'] }, recommendation: { not: null }, actionItemId: null }, orderBy: { score: 'desc' } });
  const plan = await db.actionPlan.upsert({ where: { id: `erg-plan-${program.id}` }, update: { name: `Plano de ação ergonômico — ${project.company.tradeName ?? project.company.legalName}` }, create: { id: `erg-plan-${program.id}`, companyId: project.companyId, name: `Plano de ação ergonômico — ${project.company.tradeName ?? project.company.legalName}`, year: new Date().getFullYear() } });
  let created = 0;
  for (const finding of findings) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (finding.level === 'CRITICAL' ? 15 : finding.level === 'HIGH' ? 30 : 60));
    const item = await db.actionItem.upsert({ where: { actionPlanId_code: { actionPlanId: plan.id, code: `ERG-${finding.code}` } }, update: { action: finding.recommendation!, riskId: finding.riskId, priority: finding.level, dueDate }, create: { actionPlanId: plan.id, riskId: finding.riskId, code: `ERG-${finding.code}`, action: finding.recommendation!, priority: finding.level, dueDate, reason: finding.description, method: 'Plano derivado de achado ergonômico validado', status: 'NOT_STARTED' } });
    await db.ergonomicFinding.update({ where: { id: finding.id }, data: { actionItemId: item.id, status: 'ACTION_PLANNED' } });
    created += 1;
  }
  if (created) {
    await satisfyRequirement(input.workProjectId, 'owners_deadlines', 'ActionPlan', plan.id);
    await satisfyRequirement(input.workProjectId, 'effectiveness', 'ActionPlan', plan.id);
  }
  return { plan, eligible: findings.length, created };
}

export async function saveAepDecision(input: { tenantId: string; workProjectId: string; conclusion: AepConclusion; rationale: string; requiresAet?: boolean; status?: TechnicalConclusionStatus; userId?: string }) {
  const program = await getOrCreateErgonomicsProgram(input);
  const rationale = input.rationale.trim();
  if (rationale.length < 20) throw new Error('A decisão da AEP exige fundamentação com ao menos 20 caracteres');
  const requiresAet = input.requiresAet ?? input.conclusion === 'AET_REQUIRED';
  const status = input.status ?? 'REVIEW';
  if (status === 'APPROVED' && !input.userId) throw new Error('Aprovação exige usuário responsável');
  const row = await db.ergonomicPreliminaryDecision.create({ data: { ergonomicsProgramId: program.id, conclusion: input.conclusion, rationale, requiresAet, status, approvedById: status === 'APPROVED' ? input.userId : null, approvedAt: status === 'APPROVED' ? new Date() : null } });
  await db.ergonomicsProgram.update({ where: { id: program.id }, data: { stage: requiresAet ? 'AET' : 'AEP', status: status === 'APPROVED' && !requiresAet ? 'REVIEW' : 'IN_PROGRESS' } });
  if (status === 'APPROVED') await satisfyRequirement(input.workProjectId, 'aep_decision', 'ErgonomicPreliminaryDecision', row.id);
  return row;
}

export async function getErgonomicsOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const program = await db.ergonomicsProgram.findUnique({
    where: { workProjectId: project.id },
    include: {
      demands: { orderBy: { createdAt: 'desc' } },
      workSituations: { orderBy: { createdAt: 'desc' } },
      participations: { orderBy: { occurredAt: 'desc' } },
      assessments: { orderBy: { createdAt: 'desc' } },
      findings: { orderBy: [{ level: 'desc' }, { score: 'desc' }] },
      preliminaryDecisions: { orderBy: { createdAt: 'desc' }, take: 1 },
      audits: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  return {
    companyId: project.companyId,
    project: { id: project.id, title: project.title, status: project.status, progress: project.progress },
    program,
    demandCount: program?.demands.length ?? 0,
    situationCount: program?.workSituations.length ?? 0,
    participationCount: program?.participations.length ?? 0,
    assessmentCount: program?.assessments.length ?? 0,
    findingCount: program?.findings.length ?? 0,
    highOrCriticalFindings: program?.findings.filter((item) => ['HIGH', 'CRITICAL'].includes(item.level)).length ?? 0,
    latestDecision: program?.preliminaryDecisions[0] ?? null,
    latestAudit: program?.audits[0] ?? null,
  };
}

export async function runErgonomicsAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await ergonomicsProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateErgonomicsProgram(input);
  const [situations, participationCount, assessments, findings, decisions] = await Promise.all([
    db.ergonomicWorkSituation.findMany({ where: { ergonomicsProgramId: program.id } }),
    db.ergonomicParticipation.count({ where: { ergonomicsProgramId: program.id } }),
    db.ergonomicAssessment.findMany({ where: { ergonomicsProgramId: program.id } }),
    db.ergonomicFinding.findMany({ where: { ergonomicsProgramId: program.id } }),
    db.ergonomicPreliminaryDecision.findMany({ where: { ergonomicsProgramId: program.id }, orderBy: { createdAt: 'desc' }, take: 1 }),
  ]);
  const decision = decisions[0];
  const result = auditErgonomicsCompleteness({
    hasScope: Boolean(program.scope?.trim()),
    hasResponsible: Boolean(program.responsibleUserId),
    demandCount: await db.ergonomicDemand.count({ where: { ergonomicsProgramId: program.id } }),
    workSituationCount: situations.length,
    situationsWithoutPrescribedOrActual: situations.filter((item) => !item.prescribedWork || !item.actualWork).length,
    participationCount,
    assessmentCount: assessments.length,
    calculatedAssessmentCount: assessments.filter((item) => item.engineVersion).length,
    unreviewedAssessmentCount: assessments.filter((item) => !['APPROVED', 'REJECTED'].includes(item.status)).length,
    findingCount: findings.length,
    highOrCriticalFindingCount: findings.filter((item) => ['HIGH', 'CRITICAL'].includes(item.level)).length,
    findingsWithoutRecommendation: findings.filter((item) => !item.recommendation?.trim()).length,
    findingsWithoutAction: findings.filter((item) => ['HIGH', 'CRITICAL'].includes(item.level) && !item.actionItemId).length,
    hasAepDecision: Boolean(decision),
    aepRequiresAet: Boolean(decision?.requiresAet),
    aetStageEnabled: program.stage === 'AET',
    limitationsRegistered: Array.isArray(program.limitations) && program.limitations.length > 0,
    workflowProgress: project.progress,
  });
  const row = await db.ergonomicsAuditRun.create({ data: { ergonomicsProgramId: program.id, status: result.status, score: result.score, findings: toPrismaJson(result.findings), snapshot: toPrismaJson({ projectProgress: project.progress, demandCount: await db.ergonomicDemand.count({ where: { ergonomicsProgramId: program.id } }), situationCount: situations.length, participationCount, assessmentCount: assessments.length, findingCount: findings.length }), createdById: input.userId ?? null } });
  if (result.status !== 'FAILED') await satisfyRequirement(input.workProjectId, 'technical_audit', 'ErgonomicsAuditRun', row.id);
  return row;
}
