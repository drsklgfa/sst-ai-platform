import type { PgrHazardCategory, WorkerParticipationKind } from '@prisma/client';
import { auditPgrCompleteness } from '@/domain/pgr/audit';
import { actionPriorityForRisk, assessPgrRisk, needsActionPlan, type PgrRiskInput } from '@/domain/pgr/risk';
import { protectPsychosocialDimensions, psychosocialSummary } from '@/domain/pgr/psychosocial';
import { aggregatePsychosocial } from '@/domain/engines/psychosocial';
import { db } from './db';
import { refreshWorkflowStepFromRequirements } from './work-projects';
import { toPrismaJson } from './prisma-json';


async function satisfyPgrRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

export async function getOrCreatePgrProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await db.workProject.findFirst({
    where: { id: input.workProjectId, tenantId: input.tenantId, serviceType: 'PGR' },
    include: { company: { select: { legalName: true, tradeName: true } } },
  });
  if (!project) throw new Error('Trabalho PGR não encontrado');
  const existing = await db.pgrProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const reviewCycleMonths = 24;
  const referenceDate = new Date();
  const nextReviewAt = new Date(referenceDate);
  nextReviewAt.setMonth(nextReviewAt.getMonth() + reviewCycleMonths);
  const created = await db.pgrProgram.create({
    data: {
      tenantId: input.tenantId,
      companyId: project.companyId,
      workProjectId: project.id,
      title: `PGR — ${project.company.tradeName ?? project.company.legalName}`,
      scope: 'Gerenciamento contínuo dos riscos ocupacionais do estabelecimento e atividades abrangidos pelo trabalho.',
      referenceDate,
      nextReviewAt,
      reviewCycleMonths,
      responsibleUserId: input.userId,
      assessmentCriteria: toPrismaJson({ matrix: 'SxPxE', scale: '1-5', engine: 'risk-matrix-v1', requiresResidualAssessment: true }),
      legalReferences: toPrismaJson(['NR-1 — GRO/PGR', 'NR-9 — exposições ocupacionais', 'NR-17 — ergonomia']),
      status: 'IN_PROGRESS',
    },
  });
  await satisfyPgrRequirement(project.id, 'risk_criteria', 'PgrProgram', created.id);
  await satisfyPgrRequirement(project.id, 'review_triggers', 'PgrProgram', created.id);
  return created;
}

export async function savePgrRisk(input: {
  tenantId: string;
  workProjectId: string;
  userId?: string;
  gheId?: string | null;
  inspectionId?: string | null;
  sourceType?: string;
  sourceId?: string;
  sourcePage?: number | null;
  confidence?: number | null;
  risk: PgrRiskInput;
}) {
  const program = await getOrCreatePgrProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  if (input.gheId) {
    const ghe = await db.gHE.findFirst({ where: { id: input.gheId, sector: { establishment: { companyId: program.companyId } } } });
    if (!ghe) throw new Error('GHE não pertence à empresa do PGR');
  }
  if (input.inspectionId) {
    const inspection = await db.inspection.findFirst({ where: { id: input.inspectionId, companyId: program.companyId } });
    if (!inspection) throw new Error('Vistoria não pertence à empresa do PGR');
  }
  const assessed = assessPgrRisk(input.risk);
  const saved = await db.$transaction(async (tx) => {
    const canonical = await tx.risk.upsert({
      where: { companyId_code: { companyId: program.companyId, code: assessed.code } },
      update: {
        gheId: input.gheId ?? null,
        inspectionId: input.inspectionId ?? null,
        category: assessed.category,
        hazard: assessed.hazard,
        source: assessed.source,
        possibleHarm: assessed.possibleHarms.join('; '),
        frequency: assessed.frequency,
        duration: assessed.duration,
        existingControls: toPrismaJson(assessed.existingControls ?? []),
        assessmentBasis: toPrismaJson({ circumstances: assessed.circumstances, exposedGroups: assessed.exposedGroups, monitoringData: assessed.monitoringData ?? {}, sourceType: input.sourceType, sourceId: input.sourceId, sourcePage: input.sourcePage }),
        exposedCount: assessed.exposedCount ?? 0,
        severity: assessed.severity,
        probability: assessed.probability,
        exposure: assessed.exposure ?? 1,
        initialScore: assessed.initialScore,
        initialLevel: assessed.initialLevel,
        residualScore: assessed.residualScore,
        residualLevel: assessed.residualLevel,
        lastReviewedAt: new Date(),
      },
      create: {
        companyId: program.companyId,
        gheId: input.gheId ?? null,
        inspectionId: input.inspectionId ?? null,
        code: assessed.code,
        category: assessed.category,
        hazard: assessed.hazard,
        source: assessed.source,
        possibleHarm: assessed.possibleHarms.join('; '),
        frequency: assessed.frequency,
        duration: assessed.duration,
        existingControls: toPrismaJson(assessed.existingControls ?? []),
        assessmentBasis: toPrismaJson({ circumstances: assessed.circumstances, exposedGroups: assessed.exposedGroups, monitoringData: assessed.monitoringData ?? {}, sourceType: input.sourceType, sourceId: input.sourceId, sourcePage: input.sourcePage }),
        exposedCount: assessed.exposedCount ?? 0,
        severity: assessed.severity,
        probability: assessed.probability,
        exposure: assessed.exposure ?? 1,
        initialScore: assessed.initialScore,
        initialLevel: assessed.initialLevel,
        residualScore: assessed.residualScore,
        residualLevel: assessed.residualLevel,
        lastReviewedAt: new Date(),
      },
    });
    const row = await tx.pgrRiskAssessment.upsert({
      where: { pgrProgramId_code: { pgrProgramId: program.id, code: assessed.code } },
      update: {
        riskId: canonical.id,
        gheId: input.gheId ?? null,
        inspectionId: input.inspectionId ?? null,
        category: assessed.category,
        hazard: assessed.hazard,
        source: assessed.source,
        circumstances: assessed.circumstances,
        possibleHarms: toPrismaJson(assessed.possibleHarms),
        exposedGroups: toPrismaJson(assessed.exposedGroups),
        exposedCount: assessed.exposedCount ?? 0,
        frequency: assessed.frequency,
        duration: assessed.duration,
        existingControls: toPrismaJson(assessed.existingControls ?? []),
        monitoringData: toPrismaJson(assessed.monitoringData ?? {}),
        severity: assessed.severity,
        probability: assessed.probability,
        exposure: assessed.exposure ?? 1,
        initialScore: assessed.initialScore,
        initialLevel: assessed.initialLevel,
        residualSeverity: assessed.residualSeverity,
        residualProbability: assessed.residualProbability,
        residualExposure: assessed.residualExposure,
        residualScore: assessed.residualScore,
        residualLevel: assessed.residualLevel,
        status: 'ASSESSED',
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourcePage: input.sourcePage,
        confidence: input.confidence,
        reviewedById: input.userId,
        reviewedAt: new Date(),
      },
      create: {
        pgrProgramId: program.id,
        riskId: canonical.id,
        gheId: input.gheId ?? null,
        inspectionId: input.inspectionId ?? null,
        code: assessed.code,
        category: assessed.category,
        hazard: assessed.hazard,
        source: assessed.source,
        circumstances: assessed.circumstances,
        possibleHarms: toPrismaJson(assessed.possibleHarms),
        exposedGroups: toPrismaJson(assessed.exposedGroups),
        exposedCount: assessed.exposedCount ?? 0,
        frequency: assessed.frequency,
        duration: assessed.duration,
        existingControls: toPrismaJson(assessed.existingControls ?? []),
        monitoringData: toPrismaJson(assessed.monitoringData ?? {}),
        severity: assessed.severity,
        probability: assessed.probability,
        exposure: assessed.exposure ?? 1,
        initialScore: assessed.initialScore,
        initialLevel: assessed.initialLevel,
        residualSeverity: assessed.residualSeverity,
        residualProbability: assessed.residualProbability,
        residualExposure: assessed.residualExposure,
        residualScore: assessed.residualScore,
        residualLevel: assessed.residualLevel,
        status: 'ASSESSED',
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourcePage: input.sourcePage,
        confidence: input.confidence,
        reviewedById: input.userId,
        reviewedAt: new Date(),
      },
    });
    await tx.workflowArtifact.upsert({
      where: { id: `pgr-risk-${row.id}` },
      update: { title: `${row.code} — ${row.hazard}`, entityId: row.id, metadata: toPrismaJson({ level: row.initialLevel }) },
      create: { id: `pgr-risk-${row.id}`, workProjectId: input.workProjectId, kind: 'PGR_RISK', title: `${row.code} — ${row.hazard}`, entityType: 'PgrRiskAssessment', entityId: row.id, metadata: toPrismaJson({ level: row.initialLevel }) },
    });
    return row;
  });
  for (const code of ['hazards', 'harms', 'exposed_groups', 'initial_risk']) await satisfyPgrRequirement(input.workProjectId, code, 'PgrRiskAssessment', saved.id);
  if ((saved.existingControls as unknown[]).length) await satisfyPgrRequirement(input.workProjectId, 'existing_controls', 'PgrRiskAssessment', saved.id);
  if (saved.residualLevel) await satisfyPgrRequirement(input.workProjectId, 'residual_risk', 'PgrRiskAssessment', saved.id);
  return saved;
}

export async function registerPgrParticipation(input: {
  tenantId: string;
  workProjectId: string;
  userId?: string;
  kind: WorkerParticipationKind;
  title: string;
  occurredAt?: Date;
  participantCount?: number;
  groups?: string[];
  summary?: string;
  outcomes?: string[];
  confidential?: boolean;
  evidenceFileId?: string | null;
}) {
  const program = await getOrCreatePgrProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  const title = input.title.trim();
  if (title.length < 3 || title.length > 200) throw new Error('Título da participação deve ter entre 3 e 200 caracteres');
  if (input.evidenceFileId) {
    const file = await db.fileObject.findFirst({ where: { id: input.evidenceFileId, tenantId: input.tenantId, OR: [{ companyId: null }, { companyId: program.companyId }] } });
    if (!file) throw new Error('Arquivo de evidência inválido');
  }
  const record = await db.pgrParticipationRecord.create({
    data: {
      pgrProgramId: program.id,
      kind: input.kind,
      title,
      occurredAt: input.occurredAt ?? new Date(),
      participantCount: Math.max(0, Math.trunc(input.participantCount ?? 0)),
      groups: toPrismaJson(input.groups ?? []),
      summary: input.summary?.trim() || null,
      outcomes: toPrismaJson(input.outcomes ?? []),
      confidential: Boolean(input.confidential),
      evidenceFileId: input.evidenceFileId ?? null,
      createdById: input.userId,
    },
  });
  await satisfyPgrRequirement(input.workProjectId, 'worker_participation_records', 'PgrParticipationRecord', record.id);
  if (input.kind === 'CIPA') await satisfyPgrRequirement(input.workProjectId, 'cipa_consultation', 'PgrParticipationRecord', record.id);
  return record;
}

export async function consolidatePsychosocialCampaign(input: {
  tenantId: string;
  workProjectId: string;
  campaignId: string;
  userId?: string;
}) {
  const program = await getOrCreatePgrProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  const campaign = await db.campaign.findFirst({
    where: { id: input.campaignId, companyId: program.companyId },
    include: {
      responseSessions: {
        where: { status: 'SUBMITTED', includedInConsolidation: true },
        include: { answers: { include: { question: { select: { dimension: true, reverseScore: true, minValue: true, maxValue: true } } } } },
      },
    },
  });
  if (!campaign) throw new Error('Campanha não pertence à empresa do PGR');
  const scored = campaign.responseSessions.flatMap((session) => session.answers.flatMap((answer) => {
    const dimension = answer.question.dimension?.trim();
    if (!dimension || answer.numericValue === null) return [];
    return [{ dimension, score: answer.numericValue, min: answer.question.minValue ?? 1, max: answer.question.maxValue ?? 5, reverse: answer.question.reverseScore }];
  }));
  if (!scored.length) throw new Error('A campanha não possui respostas numéricas dimensionadas para consolidação');
  const aggregate = aggregatePsychosocial(scored);
  const protectedDimensions = protectPsychosocialDimensions(
    aggregate.map((item) => ({ dimension: item.dimension, score: item.score, responseCount: item.count })),
    campaign.minimumGroupSize,
    campaign.detailedGroupSize,
  );
  const summary = psychosocialSummary(protectedDimensions);
  const assessment = await db.$transaction(async (tx) => {
    const assessment = await tx.psychosocialAssessment.create({
      data: {
        pgrProgramId: program.id,
        campaignId: campaign.id,
        status: 'REVIEW',
        methodology: 'Consolidação agregada de questionário com proteção de grupo mínimo; não constitui diagnóstico individual.',
        scope: campaign.name,
        population: campaign.expectedResponses,
        validResponses: campaign.responseSessions.length,
        minimumGroupSize: campaign.minimumGroupSize,
        detailedGroupSize: campaign.detailedGroupSize,
        dimensions: toPrismaJson(protectedDimensions),
        summary: summary.statement,
        limitations: toPrismaJson(summary.withheldDimensions ? [`${summary.withheldDimensions} dimensão(ões) ocultadas por grupo insuficiente.`] : []),
        recommendations: toPrismaJson(summary.criticalDimensions.map((dimension) => `Investigar coletivamente a organização e a gestão do trabalho relacionadas à dimensão ${dimension}.`)),
        calculatedAt: new Date(),
      },
    });
    for (const dimension of protectedDimensions) {
      if (dimension.score === null || !dimension.level) continue;
      await tx.psychosocialFinding.create({
        data: {
          psychosocialAssessmentId: assessment.id,
          dimension: dimension.dimension,
          factor: dimension.dimension,
          description: `Resultado agregado (${dimension.disclosure.toLowerCase()}) com ${dimension.responseCount} respostas válidas.`,
          score: dimension.score,
          level: dimension.level,
          evidenceCount: dimension.responseCount,
          recommendation: ['HIGH', 'CRITICAL'].includes(dimension.level) ? 'Realizar análise participativa das condições, organização e gestão do trabalho e definir medidas coletivas.' : null,
          status: 'IDENTIFIED',
        },
      });
    }
    return assessment;
  });
  for (const code of ['psychosocial_screening', 'psychosocial_participation', 'psychosocial_privacy']) await satisfyPgrRequirement(input.workProjectId, code, 'PsychosocialAssessment', assessment.id);
  return assessment;
}

export async function approvePsychosocialAssessment(input: { tenantId: string; workProjectId: string; assessmentId: string; userId: string }) {
  const assessment = await db.psychosocialAssessment.findFirst({ where: { id: input.assessmentId, pgrProgram: { tenantId: input.tenantId, workProjectId: input.workProjectId } } });
  if (!assessment) throw new Error('Avaliação psicossocial não encontrada');
  return db.psychosocialAssessment.update({ where: { id: assessment.id }, data: { status: 'APPROVED', reviewedById: input.userId, reviewedAt: new Date() } });
}

export async function generatePgrActionPlan(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const program = await getOrCreatePgrProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  const risks = await db.pgrRiskAssessment.findMany({ where: { pgrProgramId: program.id }, include: { risk: true } });
  const selected = risks.filter((item) => needsActionPlan(item.residualLevel ?? item.initialLevel) && item.riskId);
  const year = program.referenceDate.getUTCFullYear();
  const plan = await db.actionPlan.findFirst({ where: { companyId: program.companyId, name: `Plano de Ação PGR — ${program.workProjectId}` } })
    ?? await db.actionPlan.create({ data: { companyId: program.companyId, name: `Plano de Ação PGR — ${program.workProjectId}`, year } });
  let created = 0;
  for (const item of selected) {
    const code = `PGR-${item.code}`.slice(0, 80);
    const exists = await db.actionItem.findFirst({ where: { actionPlanId: plan.id, code } });
    if (exists) continue;
    const level = item.residualLevel ?? item.initialLevel;
    await db.actionItem.create({
      data: {
        actionPlanId: plan.id,
        riskId: item.riskId,
        code,
        action: `Definir, implementar e verificar medidas de prevenção para ${item.hazard}.`,
        reason: `Risco ${level.toLowerCase()} identificado no inventário do PGR.`,
        method: 'Aplicar a hierarquia de medidas de prevenção, priorizando eliminação, substituição e medidas coletivas.',
        priority: actionPriorityForRisk(level),
        status: 'DRAFT',
      },
    });
    created += 1;
  }
  if (selected.length) await satisfyPgrRequirement(input.workProjectId, 'recommendations', 'ActionPlan', plan.id);
  return { plan, eligible: selected.length, created };
}

export async function runPgrAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const program = await getOrCreatePgrProgram({ tenantId: input.tenantId, workProjectId: input.workProjectId, userId: input.userId });
  const [risks, participationCount, approvedPsychosocialCount, project, actionPlans] = await Promise.all([
    db.pgrRiskAssessment.findMany({ where: { pgrProgramId: program.id }, include: { risk: { include: { actions: true } } } }),
    db.pgrParticipationRecord.count({ where: { pgrProgramId: program.id } }),
    db.psychosocialAssessment.count({ where: { pgrProgramId: program.id, status: 'APPROVED' } }),
    db.workProject.findUniqueOrThrow({ where: { id: input.workProjectId }, select: { progress: true, responsibleUserId: true } }),
    db.actionPlan.findMany({ where: { companyId: program.companyId }, include: { items: true } }),
  ]);
  const today = new Date();
  const allActions = actionPlans.flatMap((plan) => plan.items);
  const psychosocialRequired = risks.some((risk) => risk.category === 'PSYCHOSOCIAL');
  const result = auditPgrCompleteness({
    hasScope: Boolean(program.scope?.trim()),
    hasCriteria: program.assessmentCriteria !== null && typeof program.assessmentCriteria === 'object' && Object.keys(program.assessmentCriteria as object).length > 0,
    hasResponsible: Boolean(program.responsibleUserId ?? project.responsibleUserId),
    riskCount: risks.length,
    risksWithoutSource: risks.filter((risk) => !risk.source?.trim() && !risk.circumstances?.trim()).length,
    risksWithoutHarms: risks.filter((risk) => !Array.isArray(risk.possibleHarms) || risk.possibleHarms.length === 0).length,
    risksWithoutGroups: risks.filter((risk) => !Array.isArray(risk.exposedGroups) || risk.exposedGroups.length === 0).length,
    risksWithoutControls: risks.filter((risk) => !Array.isArray(risk.existingControls) || risk.existingControls.length === 0).length,
    risksNeedingAction: risks.filter((risk) => needsActionPlan(risk.residualLevel ?? risk.initialLevel)).length,
    risksLinkedToAction: risks.filter((risk) => risk.risk?.actions.length).length,
    participationCount,
    psychosocialRequired,
    approvedPsychosocialCount,
    workflowProgress: project.progress,
    overdueActionCount: allActions.filter((action) => action.dueDate && action.dueDate < today && !['COMPLETED', 'EFFECTIVENESS_VERIFIED', 'CANCELLED'].includes(action.status)).length,
    actionsMissingOwnerOrDeadline: allActions.filter((action) => !action.responsible || !action.dueDate).length,
  });
  return db.pgrAuditRun.create({
    data: {
      pgrProgramId: program.id,
      status: result.status,
      score: result.score,
      findings: toPrismaJson(result.findings),
      snapshot: toPrismaJson({ risks: risks.length, participationCount, approvedPsychosocialCount, workflowProgress: project.progress }),
      createdById: input.userId,
    },
  });
}
