import { calculateWorkflowProgress } from '@/domain/workflows/progress';
import { workflowDefinitionFor } from '@/domain/workflows/templates';
import { toPrismaJson } from './prisma-json';
import { db } from './db';

export async function createWorkProjectFromDefinition(input: {
  tenantId: string;
  companyId: string;
  serviceType: string;
  title: string;
  responsibleUserId?: string;
  dueAt?: Date | null;
  metadata?: Record<string, unknown>;
  legacyImportBatchId?: string;
}) {
  const definition = workflowDefinitionFor(input.serviceType);
  return db.$transaction(async (tx) => {
    const template = await tx.workflowTemplate.upsert({
      where: { tenantId_code_version: { tenantId: input.tenantId, code: definition.code, version: definition.version } },
      update: {
        name: definition.name,
        serviceType: definition.serviceType,
        description: definition.description,
        active: true,
        definition: toPrismaJson(definition),
      },
      create: {
        tenantId: input.tenantId,
        code: definition.code,
        name: definition.name,
        serviceType: definition.serviceType,
        version: definition.version,
        description: definition.description,
        definition: toPrismaJson(definition),
      },
    });
    return tx.workProject.create({
      data: {
        tenantId: input.tenantId,
        companyId: input.companyId,
        workflowTemplateId: template.id,
        legacyImportBatchId: input.legacyImportBatchId,
        serviceType: definition.serviceType,
        title: input.title,
        status: 'ACTIVE',
        responsibleUserId: input.responsibleUserId,
        dueAt: input.dueAt ?? null,
        startedAt: new Date(),
        metadata: toPrismaJson({
          workflowCode: definition.code,
          workflowVersion: definition.version,
          ...(input.metadata ?? {}),
        }),
        steps: {
          create: definition.steps.map((step, index) => ({
            code: step.code,
            title: step.title,
            description: step.description,
            position: index + 1,
            required: step.required !== false,
            requirements: {
              create: step.requirements.map((item) => ({
                code: item.code,
                title: item.title,
                description: item.description,
                required: item.required !== false,
              })),
            },
          })),
        },
      },
    });
  });
}

export async function refreshWorkProjectProgress(workProjectId: string) {
  const steps = await db.workflowStep.findMany({
    where: { workProjectId },
    select: { required: true, status: true, completionPercent: true },
  });
  const progress = calculateWorkflowProgress(steps);
  const project = await db.workProject.findUniqueOrThrow({ where: { id: workProjectId }, select: { status: true } });
  const status = progress === 100 && !['CANCELLED', 'ARCHIVED'].includes(project.status) ? 'COMPLETED' : project.status === 'COMPLETED' && progress < 100 ? 'ACTIVE' : project.status;
  return db.workProject.update({ where: { id: workProjectId }, data: { progress, status, completedAt: status === 'COMPLETED' ? new Date() : null } });
}

export async function refreshWorkflowStepFromRequirements(workflowStepId: string) {
  const step = await db.workflowStep.findUniqueOrThrow({ where: { id: workflowStepId }, include: { requirements: true } });
  const required = step.requirements.filter((item) => item.required);
  const source = required.length ? required : step.requirements;
  const completed = source.filter((item) => ['SATISFIED', 'WAIVED'].includes(item.status)).length;
  const blocked = source.some((item) => item.status === 'BLOCKED');
  const completionPercent = source.length ? Math.round((completed / source.length) * 100) : 100;
  const status = blocked ? 'BLOCKED' : completionPercent === 100 ? 'COMPLETED' : completed > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
  await db.workflowStep.update({
    where: { id: workflowStepId },
    data: {
      completionPercent,
      status,
      startedAt: status === 'IN_PROGRESS' && !step.startedAt ? new Date() : step.startedAt,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      notApplicableReason: null,
    },
  });
  return refreshWorkProjectProgress(step.workProjectId);
}
