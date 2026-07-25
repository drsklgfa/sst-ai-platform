import type { AIAutonomyMode, AIRiskLevel, MembershipRole, WorkRequirementStatus } from '@prisma/client';
import { operationalToolFor, type OperationalToolName } from '@/domain/ai/operational-tools';
import { decideToolPolicy, type DataPolicyMode } from '@/domain/ai/policy';
import { hasTenantPermission } from './rbac';
import { audit } from './audit';
import { db } from './db';
import { toPrismaJson, toPrismaNullableJson } from './prisma-json';
import { createWorkProjectFromDefinition, refreshWorkflowStepFromRequirements } from './work-projects';
import { workflowDefinitionFor } from '@/domain/workflows/templates';
import { runPgrAudit } from './pgr';
import { normalizeCnpj } from '@/domain/company/cnpj';
import { getPcmsoOverview, runPcmsoAudit } from './pcmso';
import { getExposureOverview, runExposureAudit } from './exposures';
import { getErgonomicsOverview, runErgonomicsAudit } from './ergonomics';
import { getHygieneOverview, runHygieneAudit } from './hygiene';
import { getTrainingOverview, runTrainingAudit } from './training';
import { getOperationalOverview, runOperationalAudit } from './operations';

export type ToolActor = {
  tenantId: string;
  userId: string;
  role: MembershipRole;
  permissionOverrides: unknown;
  autonomy: AIAutonomyMode;
  dataPolicy: DataPolicyMode;
  aiThreadId?: string;
  workProjectId?: string | null;
};

export type PreparedOperationalTool = {
  name: OperationalToolName;
  arguments: Record<string, unknown>;
  summary: string;
  companyId?: string;
  workProjectId?: string;
  riskLevel: AIRiskLevel;
  mutating: boolean;
  reversible: boolean;
  approvalRequired: boolean;
  policyReason: string;
};

export type OperationalToolResult = {
  ok: true;
  summary: string;
  data: Record<string, unknown> | Array<unknown>;
  entityType?: string;
  entityId?: string;
  companyId?: string;
  workProjectId?: string;
  revert?: Record<string, unknown>;
};

const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const requiredText = (value: unknown, label: string, max = 5000) => {
  const parsed = text(value, max);
  if (!parsed) throw new Error(`${label} é obrigatório`);
  return parsed;
};
const int = (value: unknown, fallback = 0, max = 1_000_000) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};
const optionalDate = (value: unknown) => {
  const raw = text(value, 10);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('Data deve estar no formato AAAA-MM-DD');
  const date = new Date(`${raw}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Data inválida');
  return date;
};
const cleanCnpj = (value: unknown) => normalizeCnpj(text(value, 30));
const normalizedName = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const arrayOfText = (value: unknown, limit = 100) => Array.isArray(value)
  ? value.map((item) => text(item, 500)).filter(Boolean).slice(0, limit)
  : [];

async function companyForTenant(tenantId: string, companyId: string) {
  const company = await db.company.findFirst({ where: { id: companyId, tenantId, status: 'ACTIVE' } });
  if (!company) throw new Error('Empresa não encontrada nesta consultoria');
  return company;
}

async function workProjectForTenant(tenantId: string, workProjectId: string) {
  const project = await db.workProject.findFirst({ where: { id: workProjectId, tenantId }, include: { company: { select: { id: true, legalName: true, tradeName: true } } } });
  if (!project) throw new Error('Trabalho SST não encontrado nesta consultoria');
  return project;
}

async function validateStructureParent(tenantId: string, companyId: string, input: { establishmentId?: string; sectorId?: string; gheId?: string }) {
  await companyForTenant(tenantId, companyId);
  if (input.establishmentId) {
    const row = await db.establishment.findFirst({ where: { id: input.establishmentId, companyId, company: { tenantId } } });
    if (!row) throw new Error('Unidade não pertence à empresa informada');
  }
  if (input.sectorId) {
    const row = await db.sector.findFirst({ where: { id: input.sectorId, establishment: { companyId, company: { tenantId } } } });
    if (!row) throw new Error('Setor não pertence à empresa informada');
  }
  if (input.gheId) {
    const row = await db.gHE.findFirst({ where: { id: input.gheId, sector: { establishment: { companyId, company: { tenantId } } } } });
    if (!row) throw new Error('GHE não pertence à empresa informada');
  }
}

export async function prepareOperationalTool(name: string, rawArguments: Record<string, unknown>, actor: ToolActor): Promise<PreparedOperationalTool> {
  const spec = operationalToolFor(name);
  if (!spec) throw new Error(`Ferramenta não autorizada: ${name}`);
  if (!hasTenantPermission(actor.role, spec.permission, actor.permissionOverrides)) throw new Error(`Permissão necessária: ${spec.permission}`);
  const args: Record<string, unknown> = { ...rawArguments };
  let summary = spec.definition.description;
  let companyId: string | undefined;
  let workProjectId: string | undefined;
  let riskLevel = (spec.definition.riskLevel ?? 'LOW') as AIRiskLevel;

  switch (spec.definition.name) {
    case 'search_companies': {
      args.query = requiredText(args.query, 'Pesquisa', 120);
      args.limit = Math.max(1, Math.min(20, int(args.limit, 10, 20)));
      summary = `Pesquisar empresas por “${args.query}”`;
      break;
    }
    case 'get_company_context': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const company = await companyForTenant(actor.tenantId, companyId);
      args.companyId = companyId;
      summary = `Consultar estrutura de ${company.tradeName ?? company.legalName}`;
      break;
    }
    case 'list_work_projects': {
      companyId = text(args.companyId, 80) || undefined;
      if (companyId) await companyForTenant(actor.tenantId, companyId);
      args.companyId = companyId;
      const status = text(args.status, 40).toUpperCase();
      const validStatuses = new Set(['DRAFT', 'ACTIVE', 'WAITING_INPUT', 'WAITING_APPROVAL', 'IN_REVIEW', 'COMPLETED', 'CANCELLED', 'ARCHIVED']);
      if (status && !validStatuses.has(status)) throw new Error('Status de Trabalho SST inválido');
      args.status = status || undefined;
      args.limit = Math.max(1, Math.min(30, int(args.limit, 15, 30)));
      summary = companyId ? 'Listar trabalhos SST da empresa selecionada' : 'Listar trabalhos SST recentes';
      break;
    }
    case 'check_work_project_pending': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho SST', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = `Verificar pendências de ${project.title}`;
      break;
    }
    case 'get_pgr_overview':
    case 'run_pgr_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho PGR', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (project.serviceType !== 'PGR') throw new Error('O trabalho informado não é um PGR');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_pgr_audit' ? `Auditar completude de ${project.title}` : `Consultar panorama de ${project.title}`;
      break;
    }
    case 'get_pcmso_overview':
    case 'run_pcmso_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho PCMSO', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (project.serviceType !== 'PCMSO') throw new Error('O trabalho informado não é um PCMSO');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_pcmso_audit' ? `Auditar completude de ${project.title}` : `Consultar panorama de ${project.title}`;
      break;
    }
    case 'get_exposure_overview':
    case 'run_exposure_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho de exposições', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (!['LTCAT', 'INSALUBRIDADE', 'PERICULOSIDADE', 'HIGIENE_OCUPACIONAL'].includes(project.serviceType)) throw new Error('O trabalho informado não utiliza o núcleo de exposições');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_exposure_audit' ? `Auditar exposições de ${project.title}` : `Consultar exposições de ${project.title}`;
      break;
    }
    case 'get_ergonomics_overview':
    case 'run_ergonomics_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho AEP/AET', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (!['AET', 'AEP'].includes(project.serviceType)) throw new Error('O trabalho informado não é uma AEP/AET');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_ergonomics_audit' ? `Auditar ergonomia de ${project.title}` : `Consultar ergonomia de ${project.title}`;
      break;
    }
    case 'get_hygiene_overview':
    case 'run_hygiene_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho de higiene ocupacional', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (project.serviceType !== 'HIGIENE_OCUPACIONAL') throw new Error('O trabalho informado não é de higiene ocupacional');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_hygiene_audit' ? `Auditar higiene ocupacional de ${project.title}` : `Consultar higiene ocupacional de ${project.title}`;
      break;
    }
    case 'get_training_overview':
    case 'run_training_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho de treinamento', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (project.serviceType !== 'TREINAMENTO') throw new Error('O trabalho informado não é de treinamento');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_training_audit' ? `Auditar treinamentos de ${project.title}` : `Consultar treinamentos de ${project.title}`;
      break;
    }
    case 'get_operational_overview':
    case 'run_operational_audit': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho Operação SST 360', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      if (project.serviceType !== 'OPERACAO_SST') throw new Error('O trabalho informado não é de Operação SST 360');
      companyId = project.companyId;
      args.workProjectId = workProjectId;
      summary = spec.definition.name === 'run_operational_audit' ? `Auditar operação SST de ${project.title}` : `Consultar operação SST de ${project.title}`;
      break;
    }
    case 'create_work_project': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const company = await companyForTenant(actor.tenantId, companyId);
      const serviceType = requiredText(args.serviceType, 'Tipo de serviço', 80).toUpperCase();
      const definition = workflowDefinitionFor(serviceType);
      const dueAt = optionalDate(args.dueAt);
      args.companyId = companyId;
      args.serviceType = definition.serviceType;
      args.title = text(args.title, 200) || `${definition.name} — ${company.tradeName ?? company.legalName}`;
      args.dueAt = dueAt?.toISOString() ?? null;
      summary = `Criar ${definition.name} para ${company.tradeName ?? company.legalName}`;
      break;
    }
    case 'create_establishment': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const company = await companyForTenant(actor.tenantId, companyId);
      args.companyId = companyId;
      args.name = requiredText(args.name, 'Nome da unidade', 150);
      args.cnpj = cleanCnpj(args.cnpj);
      args.addressLine = text(args.addressLine, 300) || null;
      args.number = text(args.number, 30) || null;
      args.district = text(args.district, 120) || null;
      args.city = text(args.city, 120) || null;
      args.state = text(args.state, 2).toUpperCase() || null;
      args.zipCode = text(args.zipCode, 12) || null;
      args.employeeCount = int(args.employeeCount);
      summary = `Criar unidade “${args.name}” em ${company.tradeName ?? company.legalName}`;
      break;
    }
    case 'create_sector': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const establishmentId = requiredText(args.establishmentId, 'Unidade', 80);
      await validateStructureParent(actor.tenantId, companyId, { establishmentId });
      args.companyId = companyId;
      args.establishmentId = establishmentId;
      args.name = requiredText(args.name, 'Nome do setor', 150);
      args.description = text(args.description, 2000) || null;
      args.employeeCount = int(args.employeeCount);
      summary = `Criar setor “${args.name}”`;
      break;
    }
    case 'create_ghe': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const sectorId = requiredText(args.sectorId, 'Setor', 80);
      await validateStructureParent(actor.tenantId, companyId, { sectorId });
      args.companyId = companyId;
      args.sectorId = sectorId;
      args.name = requiredText(args.name, 'Nome do GHE', 150);
      args.code = text(args.code, 50) || null;
      args.description = text(args.description, 2000) || null;
      args.employeeCount = int(args.employeeCount);
      args.shift = text(args.shift, 120) || null;
      args.workday = text(args.workday, 300) || null;
      summary = `Criar GHE “${args.name}”`;
      break;
    }
    case 'create_job_function': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const gheId = requiredText(args.gheId, 'GHE', 80);
      await validateStructureParent(actor.tenantId, companyId, { gheId });
      args.companyId = companyId;
      args.gheId = gheId;
      args.name = requiredText(args.name, 'Nome da função', 150);
      args.cbo = text(args.cbo, 20) || null;
      args.description = text(args.description, 5000) || null;
      args.employeeCount = int(args.employeeCount);
      args.activities = arrayOfText(args.activities);
      summary = `Criar função “${args.name}”`;
      break;
    }
    case 'create_workstation': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const gheId = requiredText(args.gheId, 'GHE', 80);
      await validateStructureParent(actor.tenantId, companyId, { gheId });
      args.companyId = companyId;
      args.gheId = gheId;
      args.name = requiredText(args.name, 'Nome do posto', 150);
      args.description = text(args.description, 5000) || null;
      summary = `Criar posto “${args.name}”`;
      break;
    }
    case 'create_inspection': {
      companyId = requiredText(args.companyId, 'Empresa', 80);
      const gheId = text(args.gheId, 80) || undefined;
      await validateStructureParent(actor.tenantId, companyId, { gheId });
      args.companyId = companyId;
      args.gheId = gheId ?? null;
      args.title = requiredText(args.title, 'Título da vistoria', 200);
      args.notes = text(args.notes, 5000) || null;
      summary = `Criar vistoria “${args.title}”`;
      break;
    }
    case 'update_work_requirement': {
      workProjectId = requiredText(args.workProjectId, 'Trabalho SST', 80);
      const project = await workProjectForTenant(actor.tenantId, workProjectId);
      companyId = project.companyId;
      const status = requiredText(args.status, 'Status', 20).toUpperCase() as WorkRequirementStatus;
      if (!['PENDING', 'SATISFIED', 'WAIVED', 'BLOCKED'].includes(status)) throw new Error('Status de requisito inválido');
      const requirementId = text(args.requirementId, 80);
      const requirementCode = text(args.requirementCode, 120);
      if (!requirementId && !requirementCode) throw new Error('Informe requirementId ou requirementCode');
      const justification = text(args.justification, 4000);
      if (status === 'WAIVED' && justification.length < 10) throw new Error('Dispensa exige justificativa técnica com ao menos 10 caracteres');
      args.workProjectId = workProjectId;
      args.requirementId = requirementId || null;
      args.requirementCode = requirementCode || null;
      args.status = status;
      args.justification = justification || null;
      riskLevel = status === 'WAIVED' ? 'CRITICAL' : 'HIGH';
      summary = status === 'WAIVED' ? `Dispensar requisito de ${project.title}` : `Atualizar requisito de ${project.title} para ${status}`;
      break;
    }
  }

  const policy = spec.mutating ? decideToolPolicy({
    autonomy: actor.autonomy,
    riskLevel,
    dataPolicy: actor.dataPolicy,
  }) : { allowed: true, approvalRequired: false, reason: 'Consulta somente leitura permitida.' };
  if (!policy.allowed) throw new Error(policy.reason);
  return {
    name: spec.definition.name,
    arguments: args,
    summary,
    companyId,
    workProjectId: workProjectId ?? actor.workProjectId ?? undefined,
    riskLevel,
    mutating: spec.mutating,
    reversible: spec.reversible,
    approvalRequired: policy.approvalRequired,
    policyReason: policy.reason,
  };
}

export async function executeOperationalTool(prepared: PreparedOperationalTool, actor: ToolActor): Promise<OperationalToolResult> {
  const args = prepared.arguments;
  switch (prepared.name) {
    case 'search_companies': {
      const query = String(args.query);
      const rows = await db.company.findMany({
        where: {
          tenantId: actor.tenantId,
          status: 'ACTIVE',
          OR: [{ legalName: { contains: query, mode: 'insensitive' } }, { tradeName: { contains: query, mode: 'insensitive' } }, { cnpj: { contains: query.toUpperCase().replace(/[^A-Z0-9]/g, '') } }],
        },
        select: { id: true, legalName: true, tradeName: true, cnpj: true, primaryCnae: true, riskGrade: true, employeeCount: true },
        orderBy: { legalName: 'asc' },
        take: Number(args.limit),
      });
      return { ok: true, summary: `${rows.length} empresa(s) encontrada(s)`, data: rows };
    }
    case 'get_company_context': {
      const company = await db.company.findFirstOrThrow({
        where: { id: String(args.companyId), tenantId: actor.tenantId },
        include: { establishments: { where: { active: true }, include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true }, include: { functions: { where: { active: true } }, workstations: { where: { active: true } } } } } } } } },
      });
      return { ok: true, summary: `Estrutura de ${company.tradeName ?? company.legalName} carregada`, companyId: company.id, data: company };
    }
    case 'list_work_projects': {
      const rows = await db.workProject.findMany({
        where: { tenantId: actor.tenantId, companyId: args.companyId ? String(args.companyId) : undefined, status: args.status ? String(args.status) as never : undefined },
        select: { id: true, companyId: true, serviceType: true, title: true, status: true, progress: true, dueAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' }, take: Number(args.limit),
      });
      return { ok: true, summary: `${rows.length} trabalho(s) encontrado(s)`, data: rows };
    }
    case 'check_work_project_pending': {
      const project = await db.workProject.findFirstOrThrow({
        where: { id: String(args.workProjectId), tenantId: actor.tenantId },
        include: { steps: { orderBy: { position: 'asc' }, include: { requirements: { where: { status: { in: ['PENDING', 'BLOCKED'] } }, orderBy: { createdAt: 'asc' } } } }, approvals: { where: { status: 'PENDING' }, select: { id: true, action: true, summary: true, riskLevel: true } } },
      });
      const pending = project.steps.flatMap((step) => step.requirements.map((requirement) => ({ stepCode: step.code, stepTitle: step.title, requirementId: requirement.id, requirementCode: requirement.code, title: requirement.title, status: requirement.status, justification: requirement.justification })));
      return { ok: true, summary: `${project.progress}% concluído; ${pending.length} pendência(s)`, companyId: project.companyId, workProjectId: project.id, data: { id: project.id, title: project.title, status: project.status, progress: project.progress, pending, approvals: project.approvals } };
    }
    case 'get_pgr_overview': {
      const project = await db.workProject.findFirstOrThrow({
        where: { id: String(args.workProjectId), tenantId: actor.tenantId, serviceType: 'PGR' },
        include: {
          pgrProgram: {
            include: {
              riskAssessments: { select: { id: true, code: true, category: true, hazard: true, initialScore: true, initialLevel: true, residualScore: true, residualLevel: true, status: true } },
              participationRecords: { select: { id: true, kind: true, title: true, participantCount: true, occurredAt: true } },
              psychosocialAssessments: { select: { id: true, status: true, validResponses: true, summary: true, createdAt: true } },
              audits: { select: { id: true, status: true, score: true, findings: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });
      const data = project.pgrProgram ? {
        programId: project.pgrProgram.id,
        status: project.pgrProgram.status,
        riskCount: project.pgrProgram.riskAssessments.length,
        risks: project.pgrProgram.riskAssessments,
        participationCount: project.pgrProgram.participationRecords.length,
        participation: project.pgrProgram.participationRecords,
        psychosocial: project.pgrProgram.psychosocialAssessments,
        latestAudit: project.pgrProgram.audits[0] ?? null,
      } : { programId: null, riskCount: 0, participationCount: 0, psychosocial: [], latestAudit: null };
      return { ok: true, summary: `Panorama do PGR carregado: ${data.riskCount} risco(s)`, companyId: project.companyId, workProjectId: project.id, data };
    }
    case 'run_pgr_audit': {
      const result = await runPgrAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria PGR concluída: ${result.status} (${result.score}/100)`, entityType: 'PgrAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_pcmso_overview': {
      const data = await getPcmsoOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama do PCMSO carregado: ${data.activeWorkers} trabalhador(es) ativo(s), ${data.overdueCalls} convocação(ões) vencida(s)`, companyId: data.companyId, workProjectId: String(args.workProjectId), data };
    }
    case 'run_pcmso_audit': {
      const result = await runPcmsoAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria PCMSO concluída: ${result.status} (${result.score}/100)`, entityType: 'PcmsoAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_exposure_overview': {
      const data = await getExposureOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama carregado: ${data.periodCount} período(s), ${data.agentCount} agente(s) e ${data.pendingConclusions} conclusão(ões) pendente(s)`, companyId: data.companyId, workProjectId: String(args.workProjectId), data };
    }
    case 'run_exposure_audit': {
      const result = await runExposureAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria de exposições concluída: ${result.status} (${result.score}/100)`, entityType: 'ExposureAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_ergonomics_overview': {
      const data = await getErgonomicsOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama ergonômico: ${data.situationCount} situação(ões), ${data.assessmentCount} método(s) e ${data.findingCount} achado(s)`, companyId: data.companyId, workProjectId: String(args.workProjectId), data };
    }
    case 'run_ergonomics_audit': {
      const result = await runErgonomicsAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria ergonômica concluída: ${result.status} (${result.score}/100)`, entityType: 'ErgonomicsAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_hygiene_overview': {
      const data = await getHygieneOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama de higiene: ${data.planCount} plano(s), ${data.measurementCount} medição(ões) e ${data.approvedMeasurements} resultado(s) aprovado(s)`, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data };
    }
    case 'run_hygiene_audit': {
      const result = await runHygieneAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria de higiene concluída: ${result.status} (${result.score}/100)`, entityType: 'HygieneAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_training_overview': {
      const data = await getTrainingOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama de treinamentos: ${data.courseCount} curso(s), ${data.enrollmentCount} matrícula(s) e ${data.certificatesIssued} certificado(s)`, companyId: data.project.id ? prepared.companyId : undefined, workProjectId: String(args.workProjectId), data };
    }
    case 'run_training_audit': {
      const result = await runTrainingAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria de treinamentos concluída: ${result.status} (${result.score}/100)`, entityType: 'TrainingAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'get_operational_overview': {
      const data = await getOperationalOverview({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId) });
      return { ok: true, summary: `Panorama operacional: ${data.ppeItems.length} EPI(s), ${data.incidents.length} ocorrência(s), ${data.permits.length} permissão(ões), ${data.machines.length} máquina(s) e ${data.obligations.length} obrigação(ões)`, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: { counts: { ppeItems: data.ppeItems.length, transactions: data.ppeTransactions, incidents: data.incidents.length, permits: data.permits.length, machines: data.machines.length, chemicals: data.chemicals.length, emergencyPlans: data.emergencyPlans.length, cipaCycles: data.cipaCycles.length, contractors: data.contractors.length, obligations: data.obligations.length, esocialEvents: data.esocialEvents.length } } };
    }
    case 'run_operational_audit': {
      const result = await runOperationalAudit({ tenantId: actor.tenantId, workProjectId: String(args.workProjectId), userId: actor.userId });
      return { ok: true, summary: `Auditoria operacional concluída: ${result.status} (${result.score}/100)`, entityType: 'OperationalAuditRun', entityId: result.id, companyId: prepared.companyId, workProjectId: String(args.workProjectId), data: result };
    }
    case 'create_work_project': {
      const project = await createWorkProjectFromDefinition({
        tenantId: actor.tenantId,
        companyId: String(args.companyId),
        serviceType: String(args.serviceType),
        title: String(args.title),
        responsibleUserId: actor.userId,
        dueAt: args.dueAt ? new Date(String(args.dueAt)) : null,
        metadata: { createdBy: 'AI_COPILOT', aiThreadId: actor.aiThreadId ?? null },
      });
      return { ok: true, summary: `Trabalho criado: ${project.title}`, entityType: 'WorkProject', entityId: project.id, companyId: project.companyId, workProjectId: project.id, data: { id: project.id, title: project.title, serviceType: project.serviceType, status: project.status }, revert: { kind: 'SOFT_ARCHIVE', entityType: 'WorkProject', entityId: project.id } };
    }
    case 'create_establishment': {
      const existing = await db.establishment.findMany({ where: { companyId: String(args.companyId), active: true }, select: { id: true, name: true } });
      if (existing.some((item) => normalizedName(item.name) === normalizedName(String(args.name)))) throw new Error('Já existe uma unidade ativa com este nome');
      const row = await db.establishment.create({ data: { companyId: String(args.companyId), name: String(args.name), cnpj: args.cnpj as string | null, addressLine: args.addressLine as string | null, number: args.number as string | null, district: args.district as string | null, city: args.city as string | null, state: args.state as string | null, zipCode: args.zipCode as string | null, employeeCount: Number(args.employeeCount) } });
      return { ok: true, summary: `Unidade criada: ${row.name}`, entityType: 'Establishment', entityId: row.id, companyId: row.companyId, data: row, revert: { kind: 'DEACTIVATE', entityType: 'Establishment', entityId: row.id } };
    }
    case 'create_sector': {
      const existing = await db.sector.findMany({ where: { establishmentId: String(args.establishmentId), active: true }, select: { id: true, name: true } });
      if (existing.some((item) => normalizedName(item.name) === normalizedName(String(args.name)))) throw new Error('Já existe um setor ativo com este nome nesta unidade');
      const row = await db.sector.create({ data: { establishmentId: String(args.establishmentId), name: String(args.name), description: args.description as string | null, employeeCount: Number(args.employeeCount) } });
      return { ok: true, summary: `Setor criado: ${row.name}`, entityType: 'Sector', entityId: row.id, companyId: prepared.companyId, data: row, revert: { kind: 'DEACTIVATE', entityType: 'Sector', entityId: row.id } };
    }
    case 'create_ghe': {
      const existing = await db.gHE.findMany({ where: { sectorId: String(args.sectorId), active: true }, select: { id: true, name: true } });
      if (existing.some((item) => normalizedName(item.name) === normalizedName(String(args.name)))) throw new Error('Já existe um GHE ativo com este nome neste setor');
      const row = await db.gHE.create({ data: { sectorId: String(args.sectorId), name: String(args.name), code: args.code as string | null, description: args.description as string | null, employeeCount: Number(args.employeeCount), shift: args.shift as string | null, workday: args.workday as string | null, metadata: toPrismaJson({ createdBy: 'AI_COPILOT', aiThreadId: actor.aiThreadId ?? null }) } });
      return { ok: true, summary: `GHE criado: ${row.name}`, entityType: 'GHE', entityId: row.id, companyId: prepared.companyId, data: row, revert: { kind: 'DEACTIVATE', entityType: 'GHE', entityId: row.id } };
    }
    case 'create_job_function': {
      const existing = await db.jobFunction.findMany({ where: { gheId: String(args.gheId), active: true }, select: { id: true, name: true } });
      if (existing.some((item) => normalizedName(item.name) === normalizedName(String(args.name)))) throw new Error('Já existe uma função ativa com este nome neste GHE');
      const row = await db.jobFunction.create({ data: { gheId: String(args.gheId), name: String(args.name), cbo: args.cbo as string | null, description: args.description as string | null, employeeCount: Number(args.employeeCount), activities: toPrismaJson(args.activities, []) } });
      return { ok: true, summary: `Função criada: ${row.name}`, entityType: 'JobFunction', entityId: row.id, companyId: prepared.companyId, data: row, revert: { kind: 'DEACTIVATE', entityType: 'JobFunction', entityId: row.id } };
    }
    case 'create_workstation': {
      const existing = await db.workstation.findMany({ where: { gheId: String(args.gheId), active: true }, select: { id: true, name: true } });
      if (existing.some((item) => normalizedName(item.name) === normalizedName(String(args.name)))) throw new Error('Já existe um posto ativo com este nome neste GHE');
      const row = await db.workstation.create({ data: { gheId: String(args.gheId), name: String(args.name), description: args.description as string | null, metadata: toPrismaJson({ createdBy: 'AI_COPILOT', aiThreadId: actor.aiThreadId ?? null }) } });
      return { ok: true, summary: `Posto criado: ${row.name}`, entityType: 'Workstation', entityId: row.id, companyId: prepared.companyId, data: row, revert: { kind: 'DEACTIVATE', entityType: 'Workstation', entityId: row.id } };
    }
    case 'create_inspection': {
      const row = await db.inspection.create({ data: { companyId: String(args.companyId), gheId: args.gheId as string | null, title: String(args.title), notes: args.notes as string | null, status: 'DRAFT', performedById: actor.userId, metadata: toPrismaJson({ createdBy: 'AI_COPILOT', aiThreadId: actor.aiThreadId ?? null }) } });
      return { ok: true, summary: `Vistoria criada: ${row.title}`, entityType: 'Inspection', entityId: row.id, companyId: row.companyId, data: row, revert: { kind: 'DELETE_EMPTY_INSPECTION', entityType: 'Inspection', entityId: row.id } };
    }
    case 'update_work_requirement': {
      const requirement = await db.workflowRequirement.findFirst({
        where: { workProjectId: String(args.workProjectId), workProject: { tenantId: actor.tenantId }, ...(args.requirementId ? { id: String(args.requirementId) } : { code: String(args.requirementCode) }) },
        include: { workProject: { select: { companyId: true } } },
      });
      if (!requirement?.workflowStepId) throw new Error('Requisito não encontrado no Trabalho SST');
      const before = { status: requirement.status, justification: requirement.justification, satisfiedAt: requirement.satisfiedAt?.toISOString() ?? null };
      const status = String(args.status) as WorkRequirementStatus;
      const updated = await db.workflowRequirement.update({ where: { id: requirement.id }, data: { status, justification: ['WAIVED', 'BLOCKED'].includes(status) ? args.justification as string | null : null, satisfiedAt: ['SATISFIED', 'WAIVED'].includes(status) ? new Date() : null } });
      await refreshWorkflowStepFromRequirements(requirement.workflowStepId);
      return { ok: true, summary: `Requisito atualizado: ${updated.title} → ${updated.status}`, entityType: 'WorkflowRequirement', entityId: updated.id, companyId: requirement.workProject.companyId, workProjectId: updated.workProjectId, data: updated, revert: { kind: 'RESTORE_REQUIREMENT', entityType: 'WorkflowRequirement', entityId: updated.id, workflowStepId: requirement.workflowStepId, before } };
    }
  }
}

export async function planToolExecution(input: { prepared: PreparedOperationalTool; actor: ToolActor; toolCallId?: string }) {
  const { prepared, actor } = input;
  const changeSet = prepared.mutating ? await db.changeSet.create({
    data: {
      workProjectId: prepared.workProjectId ?? null,
      status: prepared.approvalRequired ? 'PENDING_APPROVAL' : 'DRAFT',
      summary: prepared.summary,
      operations: toPrismaJson([{ tool: prepared.name, arguments: prepared.arguments, reversible: prepared.reversible }], []),
      requestedById: actor.userId,
      metadata: toPrismaJson({ aiThreadId: actor.aiThreadId ?? null, policyReason: prepared.policyReason }),
    },
  }) : null;
  const approval = prepared.approvalRequired ? await db.approvalRequest.create({
    data: {
      workProjectId: prepared.workProjectId ?? null,
      changeSetId: changeSet?.id,
      action: prepared.name,
      summary: prepared.summary,
      riskLevel: prepared.riskLevel,
      status: 'PENDING',
      payload: toPrismaJson({ arguments: prepared.arguments, companyId: prepared.companyId ?? null, aiThreadId: actor.aiThreadId ?? null }),
      requestedById: actor.userId,
    },
  }) : null;
  const execution = await db.aIToolExecution.create({
    data: {
      tenantId: actor.tenantId,
      workProjectId: prepared.workProjectId ?? null,
      aiThreadId: actor.aiThreadId ?? null,
      approvalRequestId: approval?.id,
      changeSetId: changeSet?.id,
      toolName: prepared.name,
      riskLevel: prepared.riskLevel,
      status: prepared.approvalRequired ? 'WAITING_APPROVAL' : 'PLANNED',
      arguments: toPrismaJson(prepared.arguments),
    },
  });
  return { execution, changeSet, approval };
}

export async function runToolExecution(executionId: string, actor: ToolActor) {
  const execution = await db.aIToolExecution.findFirst({ where: { id: executionId, tenantId: actor.tenantId }, include: { approvalRequest: true, changeSet: true } });
  if (!execution) throw new Error('Execução de ferramenta não encontrada');
  if (execution.status === 'SUCCEEDED') return execution;
  if (execution.status === 'WAITING_APPROVAL' && execution.approvalRequest?.status !== 'APPROVED') throw new Error('Ação ainda não aprovada');
  if (!['PLANNED', 'WAITING_APPROVAL', 'FAILED'].includes(execution.status)) throw new Error(`Execução não pode ser iniciada no estado ${execution.status}`);
  const prepared = await prepareOperationalTool(execution.toolName, execution.arguments as Record<string, unknown>, { ...actor, workProjectId: execution.workProjectId, aiThreadId: execution.aiThreadId ?? actor.aiThreadId });
  await db.aIToolExecution.update({ where: { id: execution.id }, data: { status: 'RUNNING', startedAt: new Date(), error: null } });
  try {
    const result = await executeOperationalTool(prepared, actor);
    const completed = await db.aIToolExecution.update({ where: { id: execution.id }, data: { status: 'SUCCEEDED', result: toPrismaJson(result), completedAt: new Date() } });
    if (execution.changeSetId) await db.changeSet.update({ where: { id: execution.changeSetId }, data: { workProjectId: result.workProjectId ?? execution.workProjectId ?? null, status: 'APPLIED', appliedById: actor.userId, appliedAt: new Date(), afterSnapshot: toPrismaNullableJson(result.data), operations: toPrismaJson([{ tool: prepared.name, arguments: prepared.arguments, result: { entityType: result.entityType, entityId: result.entityId }, revert: result.revert ?? null }], []) } });
    if (execution.approvalRequestId && result.workProjectId && !execution.workProjectId) await db.approvalRequest.update({ where: { id: execution.approvalRequestId }, data: { workProjectId: result.workProjectId } });
    await audit({ tenantId: actor.tenantId, companyId: result.companyId, userId: actor.userId, action: 'AI_TOOL_EXECUTED', entityType: result.entityType ?? 'AIToolExecution', entityId: result.entityId ?? execution.id, after: { toolName: prepared.name, summary: result.summary, result: result.data }, metadata: { aiThreadId: execution.aiThreadId, workProjectId: result.workProjectId ?? execution.workProjectId, changeSetId: execution.changeSetId } });
    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.aIToolExecution.update({ where: { id: execution.id }, data: { status: 'FAILED', error: message.slice(0, 4000), completedAt: new Date() } });
    if (execution.changeSetId) await db.changeSet.update({ where: { id: execution.changeSetId }, data: { status: 'FAILED', metadata: toPrismaJson({ failure: message, aiThreadId: execution.aiThreadId }) } });
    throw error;
  }
}

export async function revertChangeSet(changeSetId: string, actor: ToolActor) {
  const changeSet = await db.changeSet.findFirst({ where: { id: changeSetId, toolExecutions: { some: { tenantId: actor.tenantId } } }, include: { toolExecutions: { where: { tenantId: actor.tenantId }, take: 1 } } });
  if (!changeSet) throw new Error('Conjunto de alterações não encontrado');
  const sourceExecution = changeSet.toolExecutions[0];
  const sourceSpec = sourceExecution ? operationalToolFor(sourceExecution.toolName) : null;
  if (!sourceSpec || !hasTenantPermission(actor.role, sourceSpec.permission, actor.permissionOverrides)) throw new Error('Sem permissão para desfazer esta alteração');
  if (changeSet.status !== 'APPLIED') throw new Error('Somente alterações aplicadas podem ser desfeitas');
  const operations = Array.isArray(changeSet.operations) ? changeSet.operations as Array<Record<string, unknown>> : [];
  const operation = operations[0] ?? {};
  const revert = operation.revert && typeof operation.revert === 'object' ? operation.revert as Record<string, unknown> : null;
  if (!revert) throw new Error('Esta alteração não possui operação segura de desfazer');
  const entityId = requiredText(revert.entityId, 'Entidade', 80);
  switch (String(revert.kind)) {
    case 'SOFT_ARCHIVE':
      await db.workProject.update({ where: { id: entityId }, data: { status: 'ARCHIVED' } });
      break;
    case 'DEACTIVATE': {
      const entityType = String(revert.entityType);
      if (entityType === 'Establishment') await db.establishment.update({ where: { id: entityId }, data: { active: false } });
      else if (entityType === 'Sector') await db.sector.update({ where: { id: entityId }, data: { active: false } });
      else if (entityType === 'GHE') await db.gHE.update({ where: { id: entityId }, data: { active: false } });
      else if (entityType === 'JobFunction') await db.jobFunction.update({ where: { id: entityId }, data: { active: false } });
      else if (entityType === 'Workstation') await db.workstation.update({ where: { id: entityId }, data: { active: false } });
      else throw new Error('Entidade não suportada para desativação');
      break;
    }
    case 'DELETE_EMPTY_INSPECTION': {
      const inspection = await db.inspection.findFirst({ where: { id: entityId, company: { tenantId: actor.tenantId } }, include: { _count: { select: { items: true, evidences: true, calculations: true, risks: true } } } });
      if (!inspection) throw new Error('Vistoria não encontrada');
      if (Object.values(inspection._count as Record<string, number>).some((count) => count > 0)) throw new Error('A vistoria já possui dados e não pode ser removida automaticamente');
      await db.inspection.delete({ where: { id: entityId } });
      break;
    }
    case 'RESTORE_REQUIREMENT': {
      const before = revert.before && typeof revert.before === 'object' ? revert.before as Record<string, unknown> : {};
      const workflowStepId = requiredText(revert.workflowStepId, 'Etapa', 80);
      await db.workflowRequirement.update({ where: { id: entityId }, data: { status: String(before.status) as WorkRequirementStatus, justification: before.justification ? String(before.justification) : null, satisfiedAt: before.satisfiedAt ? new Date(String(before.satisfiedAt)) : null } });
      await refreshWorkflowStepFromRequirements(workflowStepId);
      break;
    }
    default:
      throw new Error('Operação de desfazer não reconhecida');
  }
  const updated = await db.changeSet.update({ where: { id: changeSet.id }, data: { status: 'REVERTED', revertedById: actor.userId, revertedAt: new Date() } });
  await audit({ tenantId: actor.tenantId, userId: actor.userId, action: 'AI_CHANGESET_REVERTED', entityType: 'ChangeSet', entityId: changeSet.id, before: changeSet, after: updated });
  return updated;
}
