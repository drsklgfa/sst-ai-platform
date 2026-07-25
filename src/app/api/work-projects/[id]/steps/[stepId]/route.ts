import { NextResponse } from 'next/server';
import type { WorkflowStepStatus } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { refreshWorkProjectProgress } from '@/lib/work-projects';

const statuses = new Set<WorkflowStepStatus>(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'NOT_APPLICABLE']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stepId: string }> }) {
  if (!env.FEATURE_V10_WORKS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id, stepId } = await params;
  const before = await db.workflowStep.findFirst({ where: { id: stepId, workProjectId: id, workProject: { tenantId: tenant.id } }, include: { workProject: { select: { companyId: true } } } });
  if (!before) return new Response('Etapa não encontrada', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status') ?? '') as WorkflowStepStatus;
  if (!statuses.has(status)) return new Response('Status inválido', { status: 400 });
  const reason = String(form.get('notApplicableReason') ?? '').trim();
  if (status === 'NOT_APPLICABLE' && reason.length < 10) return new Response('Informe uma justificativa com ao menos 10 caracteres', { status: 400 });
  const completionPercent = status === 'COMPLETED' || status === 'NOT_APPLICABLE' ? 100 : status === 'NOT_STARTED' || status === 'BLOCKED' ? 0 : Math.max(1, Math.min(99, Number(form.get('completionPercent')) || before.completionPercent || 1));
  const updated = await db.workflowStep.update({
    where: { id: stepId },
    data: {
      status,
      completionPercent,
      notApplicableReason: status === 'NOT_APPLICABLE' ? reason : null,
      startedAt: ['IN_PROGRESS', 'BLOCKED', 'COMPLETED'].includes(status) && !before.startedAt ? new Date() : before.startedAt,
      completedAt: ['COMPLETED', 'NOT_APPLICABLE'].includes(status) ? new Date() : null,
    },
  });
  await refreshWorkProjectProgress(id);
  await audit({ tenantId: tenant.id, companyId: before.workProject.companyId, userId: user.id, action: 'WORKFLOW_STEP_UPDATED', entityType: 'WorkflowStep', entityId: stepId, before, after: updated });
  return NextResponse.redirect(publicAppUrl(`/work-projects/${id}`), 303);
}
