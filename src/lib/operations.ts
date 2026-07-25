import type { IncidentInvestigationMethod, IncidentSeverity, MachineAssetStatus, PpeTransactionType, RiskLevel, SafetyIncidentKind, WorkPermitType } from '@prisma/client';
import { auditOperationalCompleteness } from '@/domain/operations/audit';
import { contractorComplianceScore, incidentEscalation, obligationState, permitEligibility, ppeDeliveryEligible } from '@/domain/operations/rules';
import { db } from './db';
import { randomToken } from './crypto';
import { toPrismaJson } from './prisma-json';
import { refreshWorkflowStepFromRequirements } from './work-projects';
import { queueEsocialDraft } from './esocial';

const operationalTypes = new Set(['OPERACAO_SST', 'EPI_EPC', 'ACIDENTES', 'PERMISSOES_TRABALHO', 'MAQUINAS_NR12', 'PRODUTOS_QUIMICOS', 'EMERGENCIAS', 'CIPA', 'CONTRATADAS', 'COMPLIANCE']);

async function operationalProject(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({ where: { id: workProjectId, tenantId }, include: { company: { select: { id: true, legalName: true, tradeName: true } } } });
  if (!project || !operationalTypes.has(project.serviceType)) throw new Error('Trabalho operacional SST não encontrado');
  return project;
}

async function satisfyRequirement(workProjectId: string, code: string, sourceType: string, sourceId: string) {
  const requirement = await db.workflowRequirement.findFirst({ where: { workProjectId, code }, select: { id: true, workflowStepId: true, status: true } });
  if (!requirement?.workflowStepId || requirement.status === 'SATISFIED') return;
  await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status: 'SATISFIED', sourceType, sourceId, satisfiedAt: new Date() } });
  await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
}

export async function getOrCreateOperationalProgram(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const project = await operationalProject(input.tenantId, input.workProjectId);
  const existing = await db.operationalSstProgram.findUnique({ where: { workProjectId: project.id } });
  if (existing) return existing;
  const program = await db.operationalSstProgram.create({ data: {
    tenantId: input.tenantId, companyId: project.companyId, workProjectId: project.id,
    title: `Operação SST 360 — ${project.company.tradeName ?? project.company.legalName}`,
    status: 'ACTIVE', responsibleUserId: input.userId ?? null,
    scope: 'Gestão integrada de EPI/EPC, acidentes, permissões, máquinas, produtos químicos, emergências, CIPA, contratadas, conformidade e eventos SST do eSocial.',
  } });
  await satisfyRequirement(project.id, 'operational_scope', 'OperationalSstProgram', program.id);
  if (input.userId) await satisfyRequirement(project.id, 'operational_responsible', 'OperationalSstProgram', program.id);
  return program;
}

export async function updateOperationalProgram(input: { tenantId: string; workProjectId: string; scope: string; responsibleUserId?: string | null; nextReviewAt?: Date | null }) {
  const program = await getOrCreateOperationalProgram(input);
  if (input.scope.trim().length < 15) throw new Error('Escopo operacional detalhado é obrigatório');
  const row = await db.operationalSstProgram.update({ where: { id: program.id }, data: { scope: input.scope.trim(), responsibleUserId: input.responsibleUserId ?? null, nextReviewAt: input.nextReviewAt ?? null } });
  await satisfyRequirement(input.workProjectId, 'operational_scope', 'OperationalSstProgram', row.id);
  if (row.responsibleUserId) await satisfyRequirement(input.workProjectId, 'operational_responsible', 'OperationalSstProgram', row.id);
  return row;
}

export async function createPpeItem(input: { tenantId: string; workProjectId: string; code: string; name: string; category: string; caNumber?: string | null; caExpiresAt?: Date | null; manufacturer?: string | null; model?: string | null; stockQuantity?: number; minimumStock?: number; unitCostCents?: number | null; sizes?: string[] }) {
  const project = await operationalProject(input.tenantId, input.workProjectId);
  await getOrCreateOperationalProgram(input);
  const code = input.code.trim().toUpperCase();
  if (code.length < 2 || input.name.trim().length < 3) throw new Error('Código e nome do EPI são obrigatórios');
  const row = await db.ppeCatalogItem.create({ data: { tenantId: input.tenantId, companyId: project.companyId, code, name: input.name.trim(), category: input.category.trim(), caNumber: input.caNumber?.trim() || null, caExpiresAt: input.caExpiresAt ?? null, manufacturer: input.manufacturer?.trim() || null, model: input.model?.trim() || null, stockQuantity: Math.max(0, Math.round(input.stockQuantity ?? 0)), minimumStock: Math.max(0, Math.round(input.minimumStock ?? 0)), unitCostCents: input.unitCostCents ?? null, sizes: toPrismaJson(input.sizes ?? []) } });
  await satisfyRequirement(input.workProjectId, 'ppe_catalog', 'PpeCatalogItem', row.id);
  return row;
}

export async function registerPpeTransaction(input: { tenantId: string; workProjectId: string; workerId: string; ppeItemId: string; type: PpeTransactionType; quantity: number; size?: string | null; trainingConfirmed?: boolean; fitConfirmed?: boolean; dueReturnAt?: Date | null; notes?: string | null; performedById?: string }) {
  const project = await operationalProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateOperationalProgram(input);
  const [worker, item] = await Promise.all([
    db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: project.companyId, status: 'ACTIVE' } }),
    db.ppeCatalogItem.findFirst({ where: { id: input.ppeItemId, tenantId: input.tenantId, active: true, OR: [{ companyId: project.companyId }, { companyId: null }] } }),
  ]);
  if (!worker) throw new Error('Trabalhador ativo não encontrado');
  if (!item) throw new Error('EPI não encontrado');
  const quantity = Math.round(input.quantity);
  if (input.type === 'ISSUE' || input.type === 'EXCHANGE') {
    const eligibility = ppeDeliveryEligible({ caExpiresAt: item.caExpiresAt, trainingConfirmed: input.trainingConfirmed ?? false, fitConfirmed: input.fitConfirmed ?? false, stockQuantity: item.stockQuantity, quantity });
    if (!eligibility.eligible) throw new Error(`Entrega bloqueada: ${eligibility.reasons.join(', ')}`);
  }
  return db.$transaction(async (tx) => {
    const delta = ['ISSUE', 'EXCHANGE', 'LOSS', 'DAMAGE'].includes(input.type) ? -quantity : input.type === 'RETURN' ? quantity : 0;
    if (delta) await tx.ppeCatalogItem.update({ where: { id: item.id }, data: { stockQuantity: { increment: delta } } });
    const row = await tx.ppeTransaction.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, workerId: worker.id, ppeItemId: item.id, type: input.type, quantity, size: input.size?.trim() || null, dueReturnAt: input.dueReturnAt ?? null, trainingConfirmed: input.trainingConfirmed ?? false, fitConfirmed: input.fitConfirmed ?? false, notes: input.notes?.trim() || null, performedById: input.performedById ?? null } });
    return row;
  }).then(async (row) => { await satisfyRequirement(input.workProjectId, 'ppe_delivery', 'PpeTransaction', row.id); return row; });
}

export async function createSafetyIncident(input: { tenantId: string; workProjectId: string; kind: SafetyIncidentKind; title: string; description: string; occurredAt: Date; location?: string | null; severity: IncidentSeverity; workerId?: string | null; lostTime?: boolean; fatality?: boolean; userId?: string }) {
  const project = await operationalProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateOperationalProgram(input);
  if (input.title.trim().length < 3 || input.description.trim().length < 10) throw new Error('Título e descrição detalhada da ocorrência são obrigatórios');
  if (input.workerId) {
    const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: project.companyId } });
    if (!worker) throw new Error('Trabalhador não pertence à empresa');
  }
  const escalation = incidentEscalation({ kind: input.kind, severity: input.severity, workerInvolved: Boolean(input.workerId), lostTime: input.lostTime ?? false, fatality: input.fatality ?? false });
  const row = await db.safetyIncidentRecord.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, kind: input.kind, title: input.title.trim(), description: input.description.trim(), occurredAt: input.occurredAt, location: input.location?.trim() || null, severity: input.severity, workerId: input.workerId ?? null, catRequired: escalation.catRequired, investigatorUserId: escalation.formalInvestigation ? input.userId ?? null : null, metadata: toPrismaJson({ lostTime: input.lostTime ?? false, fatality: input.fatality ?? false, immediateNotification: escalation.immediateNotification, formalInvestigation: escalation.formalInvestigation }) } });
  if (escalation.esocialS2210Required && input.workerId) {
    const event = await queueEsocialDraft({ tenantId: input.tenantId, companyId: project.companyId, workerId: input.workerId, eventType: 'S2210', relatedEntityType: 'SafetyIncidentRecord', relatedEntityId: row.id, payload: { incidentId: row.id, occurredAt: row.occurredAt.toISOString(), kind: row.kind, severity: row.severity, catRequired: row.catRequired }, userId: input.userId });
    await db.safetyIncidentRecord.update({ where: { id: row.id }, data: { esocialEventId: event.id } });
  }
  await satisfyRequirement(input.workProjectId, 'incident_records', 'SafetyIncidentRecord', row.id);
  return row;
}

export async function saveIncidentInvestigation(input: { tenantId: string; incidentId: string; method: IncidentInvestigationMethod; timeline?: unknown[]; interviews?: unknown[]; evidence?: unknown[]; immediateCauses?: string[]; rootCauses?: string[]; failedBarriers?: string[]; conclusions?: string | null; approve?: boolean; approvedById?: string }) {
  const incident = await db.safetyIncidentRecord.findFirst({ where: { id: input.incidentId, tenantId: input.tenantId } });
  if (!incident) throw new Error('Ocorrência não encontrada');
  if (input.approve && (!input.approvedById || (input.conclusions?.trim().length ?? 0) < 10)) throw new Error('Aprovação exige responsável e conclusão fundamentada');
  return db.incidentInvestigation.upsert({ where: { incidentId: incident.id }, update: { method: input.method, timeline: toPrismaJson(input.timeline ?? []), interviews: toPrismaJson(input.interviews ?? []), evidence: toPrismaJson(input.evidence ?? []), immediateCauses: toPrismaJson(input.immediateCauses ?? []), rootCauses: toPrismaJson(input.rootCauses ?? []), failedBarriers: toPrismaJson(input.failedBarriers ?? []), conclusions: input.conclusions?.trim() || null, status: input.approve ? 'APPROVED' : 'IN_REVIEW', approvedById: input.approve ? input.approvedById : null, approvedAt: input.approve ? new Date() : null }, create: { incidentId: incident.id, method: input.method, timeline: toPrismaJson(input.timeline ?? []), interviews: toPrismaJson(input.interviews ?? []), evidence: toPrismaJson(input.evidence ?? []), immediateCauses: toPrismaJson(input.immediateCauses ?? []), rootCauses: toPrismaJson(input.rootCauses ?? []), failedBarriers: toPrismaJson(input.failedBarriers ?? []), conclusions: input.conclusions?.trim() || null, status: input.approve ? 'APPROVED' : 'IN_REVIEW', approvedById: input.approve ? input.approvedById : null, approvedAt: input.approve ? new Date() : null } });
}

export async function createWorkPermit(input: { tenantId: string; workProjectId: string; type: WorkPermitType; title: string; location: string; startsAt: Date; endsAt: Date; riskAssessment?: Record<string, unknown>; checklist?: Array<{ title: string; completed: boolean }>; controls?: string[]; workers?: unknown[]; measurements?: unknown[]; issuerUserId?: string; approverUserId?: string | null; authorize?: boolean }) {
  const project = await operationalProject(input.tenantId, input.workProjectId);
  const program = await getOrCreateOperationalProgram(input);
  const checklist = input.checklist ?? [];
  const eligibility = permitEligibility({ startsAt: input.startsAt, endsAt: input.endsAt, checklistItems: checklist.length, completedChecklistItems: checklist.filter((item) => item.completed).length, controlCount: input.controls?.length ?? 0, workerCount: input.workers?.length ?? 0, approverUserId: input.approverUserId, measurementsRequired: ['CONFINED_SPACE', 'HOT_WORK'].includes(input.type), measurementCount: input.measurements?.length ?? 0 });
  if (input.authorize && !eligibility.eligible) throw new Error(`Permissão não pode ser autorizada: ${eligibility.reasons.join(', ')}`);
  const row = await db.workPermit.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, type: input.type, title: input.title.trim(), location: input.location.trim(), startsAt: input.startsAt, endsAt: input.endsAt, status: input.authorize ? 'AUTHORIZED' : 'DRAFT', riskAssessment: toPrismaJson(input.riskAssessment ?? {}), checklist: toPrismaJson(checklist), controls: toPrismaJson(input.controls ?? []), workers: toPrismaJson(input.workers ?? []), measurements: toPrismaJson(input.measurements ?? []), issuerUserId: input.issuerUserId ?? null, approverUserId: input.authorize ? input.approverUserId ?? null : null, approvedAt: input.authorize ? new Date() : null, qrCode: randomToken(18) } });
  await satisfyRequirement(input.workProjectId, 'work_permits', 'WorkPermit', row.id);
  return row;
}

export async function createMachineAsset(input: { tenantId: string; workProjectId: string; code: string; name: string; manufacturer?: string | null; model?: string | null; serialNumber?: string | null; sectorId?: string | null; location?: string | null; status?: MachineAssetStatus; riskLevel?: RiskLevel | null; protections?: string[]; safetyDevices?: string[]; nextInspectionAt?: Date | null; responsibleUserId?: string | null }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  if (input.sectorId) { const sector = await db.sector.findFirst({ where: { id: input.sectorId, companyId: project.companyId } }); if (!sector) throw new Error('Setor não pertence à empresa'); }
  const row = await db.machineAsset.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, code: input.code.trim().toUpperCase(), name: input.name.trim(), manufacturer: input.manufacturer?.trim() || null, model: input.model?.trim() || null, serialNumber: input.serialNumber?.trim() || null, sectorId: input.sectorId ?? null, location: input.location?.trim() || null, status: input.status ?? 'ACTIVE', riskLevel: input.riskLevel ?? null, protections: toPrismaJson(input.protections ?? []), safetyDevices: toPrismaJson(input.safetyDevices ?? []), nextInspectionAt: input.nextInspectionAt ?? null, responsibleUserId: input.responsibleUserId ?? null } });
  await satisfyRequirement(input.workProjectId, 'machine_inventory', 'MachineAsset', row.id); return row;
}

export async function createChemicalProduct(input: { tenantId: string; workProjectId: string; productCode: string; name: string; manufacturer?: string | null; casNumbers?: string[]; sdsRevision?: string | null; sdsFileId?: string | null; hazardClasses?: string[]; storageRules?: string[]; incompatibilities?: string[]; exposureControls?: string[]; emergencyMeasures?: string[] }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  if (input.sdsFileId) { const file = await db.fileObject.findFirst({ where: { id: input.sdsFileId, tenantId: input.tenantId } }); if (!file) throw new Error('FDS não pertence à consultoria'); }
  const row = await db.chemicalProduct.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, productCode: input.productCode.trim().toUpperCase(), name: input.name.trim(), manufacturer: input.manufacturer?.trim() || null, casNumbers: toPrismaJson(input.casNumbers ?? []), sdsRevision: input.sdsRevision?.trim() || null, sdsFileId: input.sdsFileId ?? null, hazardClasses: toPrismaJson(input.hazardClasses ?? []), storageRules: toPrismaJson(input.storageRules ?? []), incompatibilities: toPrismaJson(input.incompatibilities ?? []), exposureControls: toPrismaJson(input.exposureControls ?? []), emergencyMeasures: toPrismaJson(input.emergencyMeasures ?? []) } });
  await satisfyRequirement(input.workProjectId, 'chemical_inventory', 'ChemicalProduct', row.id); return row;
}

export async function createEmergencyPlan(input: { tenantId: string; workProjectId: string; title: string; scenarios: string[]; responseTeams: unknown[]; evacuationRoutes?: unknown[]; meetingPoints?: string[]; emergencyContacts?: unknown[]; equipment?: unknown[]; nextDrillAt?: Date | null; approve?: boolean; approvedById?: string | null }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  if (input.approve && (!input.approvedById || input.scenarios.length < 1 || input.responseTeams.length < 1)) throw new Error('Aprovação exige cenários, equipes e responsável');
  const row = await db.emergencyPlan.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, title: input.title.trim(), status: input.approve ? 'APPROVED' : 'DRAFT', scenarios: toPrismaJson(input.scenarios), responseTeams: toPrismaJson(input.responseTeams), evacuationRoutes: toPrismaJson(input.evacuationRoutes ?? []), meetingPoints: toPrismaJson(input.meetingPoints ?? []), emergencyContacts: toPrismaJson(input.emergencyContacts ?? []), equipment: toPrismaJson(input.equipment ?? []), nextDrillAt: input.nextDrillAt ?? null, approvedById: input.approve ? input.approvedById ?? null : null, approvedAt: input.approve ? new Date() : null } });
  await satisfyRequirement(input.workProjectId, 'emergency_plan', 'EmergencyPlan', row.id); return row;
}

export async function createCipaCycle(input: { tenantId: string; workProjectId: string; title: string; startAt: Date; endAt: Date; dimensioning?: Record<string, unknown>; election?: Record<string, unknown>; members?: unknown[]; annualPlan?: unknown[]; harassmentActions?: unknown[] }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  if (input.endAt <= input.startAt) throw new Error('Período da CIPA inválido');
  const row = await db.cipaCycle.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, title: input.title.trim(), startAt: input.startAt, endAt: input.endAt, status: 'PLANNING', dimensioning: toPrismaJson(input.dimensioning ?? {}), election: toPrismaJson(input.election ?? {}), members: toPrismaJson(input.members ?? []), annualPlan: toPrismaJson(input.annualPlan ?? []), harassmentActions: toPrismaJson(input.harassmentActions ?? []) } });
  await satisfyRequirement(input.workProjectId, 'cipa_cycle', 'CipaCycle', row.id); return row;
}

export async function createContractor(input: { tenantId: string; workProjectId: string; legalName: string; taxId?: string | null; contractStart?: Date | null; contractEnd?: Date | null; responsibleName?: string | null; responsibleEmail?: string | null; workers?: unknown[]; documentRequirements?: Array<{ required: boolean; valid: boolean }>; riskSharing?: unknown[]; integrationCompleted?: boolean }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  const docs = input.documentRequirements ?? [];
  const compliance = contractorComplianceScore({ requiredDocuments: docs.filter((item) => item.required).length, validDocuments: docs.filter((item) => item.required && item.valid).length, requiredWorkers: input.workers?.length ?? 0, clearedWorkers: (input.workers ?? []).filter((item) => typeof item === 'object' && item !== null && (item as { cleared?: boolean }).cleared).length, riskSharingDefined: (input.riskSharing?.length ?? 0) > 0, integrationCompleted: input.integrationCompleted ?? false });
  const row = await db.contractorCompany.create({ data: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, legalName: input.legalName.trim(), taxId: input.taxId?.trim() || null, contractStart: input.contractStart ?? null, contractEnd: input.contractEnd ?? null, status: compliance.status, responsibleName: input.responsibleName?.trim() || null, responsibleEmail: input.responsibleEmail?.trim() || null, workers: toPrismaJson(input.workers ?? []), documentRequirements: toPrismaJson(docs), riskSharing: toPrismaJson(input.riskSharing ?? []), complianceScore: compliance.score } });
  await satisfyRequirement(input.workProjectId, 'contractor_control', 'ContractorCompany', row.id); return row;
}

export async function upsertComplianceObligation(input: { tenantId: string; workProjectId: string; code: string; title: string; source: string; sourceVersion?: string | null; applicability: string; frequency?: string | null; dueAt?: Date | null; responsibleUserId?: string | null; completedAt?: Date | null; waiverReason?: string | null }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input);
  const status = obligationState({ dueAt: input.dueAt, completedAt: input.completedAt, waived: Boolean(input.waiverReason) });
  const row = await db.complianceObligation.upsert({ where: { operationalProgramId_code: { operationalProgramId: program.id, code: input.code.trim().toUpperCase() } }, update: { title: input.title.trim(), source: input.source.trim(), sourceVersion: input.sourceVersion?.trim() || null, applicability: input.applicability.trim(), frequency: input.frequency?.trim() || null, dueAt: input.dueAt ?? null, responsibleUserId: input.responsibleUserId ?? null, completedAt: input.completedAt ?? null, waiverReason: input.waiverReason?.trim() || null, status }, create: { tenantId: input.tenantId, companyId: project.companyId, operationalProgramId: program.id, code: input.code.trim().toUpperCase(), title: input.title.trim(), source: input.source.trim(), sourceVersion: input.sourceVersion?.trim() || null, applicability: input.applicability.trim(), frequency: input.frequency?.trim() || null, dueAt: input.dueAt ?? null, responsibleUserId: input.responsibleUserId ?? null, completedAt: input.completedAt ?? null, waiverReason: input.waiverReason?.trim() || null, status } });
  await satisfyRequirement(input.workProjectId, 'legal_matrix', 'ComplianceObligation', row.id); return row;
}

export async function getOperationalOverview(input: { tenantId: string; workProjectId: string }) {
  const project = await operationalProject(input.tenantId, input.workProjectId); const program = await getOrCreateOperationalProgram(input); const now = new Date();
  const [ppeItems, ppeTransactions, incidents, permits, machines, chemicals, emergencyPlans, cipaCycles, contractors, obligations, esocialEvents] = await Promise.all([
    db.ppeCatalogItem.findMany({ where: { tenantId: input.tenantId, active: true, OR: [{ companyId: project.companyId }, { companyId: null }] } }),
    db.ppeTransaction.count({ where: { operationalProgramId: program.id } }),
    db.safetyIncidentRecord.findMany({ where: { operationalProgramId: program.id }, include: {} }),
    db.workPermit.findMany({ where: { operationalProgramId: program.id } }),
    db.machineAsset.findMany({ where: { operationalProgramId: program.id } }),
    db.chemicalProduct.findMany({ where: { operationalProgramId: program.id, active: true } }),
    db.emergencyPlan.findMany({ where: { operationalProgramId: program.id } }),
    db.cipaCycle.findMany({ where: { operationalProgramId: program.id } }),
    db.contractorCompany.findMany({ where: { operationalProgramId: program.id } }),
    db.complianceObligation.findMany({ where: { operationalProgramId: program.id } }),
    db.esocialEventQueue.findMany({ where: { tenantId: input.tenantId, companyId: project.companyId } }),
  ]);
  return { project, program, ppeItems, ppeTransactions, incidents, permits, machines, chemicals, emergencyPlans, cipaCycles, contractors, obligations, esocialEvents, now };
}

export async function runOperationalAudit(input: { tenantId: string; workProjectId: string; userId?: string }) {
  const overview = await getOperationalOverview(input); const now = overview.now;
  const incidentIds = overview.incidents.filter((item) => ['HIGH', 'CRITICAL'].includes(item.severity)).map((item) => item.id);
  const investigated = incidentIds.length ? await db.incidentInvestigation.count({ where: { incidentId: { in: incidentIds }, status: 'APPROVED' } }) : 0;
  const drillsOverdue = await db.emergencyDrill.count({ where: { emergencyPlanId: { in: overview.emergencyPlans.map((item) => item.id) }, status: { in: ['PLANNED', 'IN_PROGRESS'] }, occurredAt: { lt: now } } });
  const auditResult = auditOperationalCompleteness({
    hasScope: Boolean(overview.program.scope?.trim()), hasResponsible: Boolean(overview.program.responsibleUserId), ppeItems: overview.ppeItems.length,
    expiredCaItems: overview.ppeItems.filter((item) => item.caExpiresAt && item.caExpiresAt < now).length, lowStockItems: overview.ppeItems.filter((item) => item.stockQuantity <= item.minimumStock).length,
    incidentsOpen: overview.incidents.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length, incidentsWithoutInvestigation: Math.max(0, incidentIds.length - investigated), catPending: overview.incidents.filter((item) => item.catRequired && !item.catIssuedAt).length,
    permitsActive: overview.permits.filter((item) => ['AUTHORIZED', 'ACTIVE'].includes(item.status)).length, permitsExpiredOpen: overview.permits.filter((item) => !['CLOSED', 'CANCELLED', 'EXPIRED'].includes(item.status) && item.endsAt < now).length,
    machines: overview.machines.length, blockedMachines: overview.machines.filter((item) => ['BLOCKED', 'RESTRICTED'].includes(item.status)).length, overdueMachineInspections: overview.machines.filter((item) => item.nextInspectionAt && item.nextInspectionAt < now).length,
    chemicalProducts: overview.chemicals.length, chemicalsWithoutSds: overview.chemicals.filter((item) => !item.sdsFileId).length,
    emergencyPlanApproved: overview.emergencyPlans.some((item) => item.status === 'APPROVED'), drillsOverdue,
    cipaRequired: Boolean((overview.program.metadata as { cipaRequired?: boolean } | null)?.cipaRequired), cipaActive: overview.cipaCycles.some((item) => item.status === 'ACTIVE'),
    contractors: overview.contractors.length, nonCompliantContractors: overview.contractors.filter((item) => ['NON_COMPLIANT', 'BLOCKED', 'EXPIRED'].includes(item.status)).length,
    obligations: overview.obligations.length, overdueObligations: overview.obligations.filter((item) => item.status === 'OVERDUE' || (!item.completedAt && item.dueAt && item.dueAt < now)).length,
    esocialRejected: overview.esocialEvents.filter((item) => item.status === 'REJECTED').length, workflowProgress: overview.project.progress,
  });
  const row = await db.operationalAuditRun.create({ data: { operationalProgramId: overview.program.id, status: auditResult.status, score: auditResult.score, findings: toPrismaJson(auditResult.findings), snapshot: toPrismaJson({ counts: { ppe: overview.ppeItems.length, incidents: overview.incidents.length, permits: overview.permits.length, machines: overview.machines.length, chemicals: overview.chemicals.length, contractors: overview.contractors.length, obligations: overview.obligations.length, esocial: overview.esocialEvents.length } }), createdById: input.userId ?? null } });
  await satisfyRequirement(input.workProjectId, 'operational_audit', 'OperationalAuditRun', row.id);
  return row;
}
