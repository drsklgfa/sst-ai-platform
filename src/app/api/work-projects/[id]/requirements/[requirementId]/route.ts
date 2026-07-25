import { NextResponse } from 'next/server';
import type { WorkRequirementStatus } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { refreshWorkflowStepFromRequirements } from '@/lib/work-projects';

const statuses = new Set<WorkRequirementStatus>(['PENDING', 'SATISFIED', 'WAIVED', 'BLOCKED']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; requirementId: string }> }) {
  if (!env.FEATURE_V10_WORKS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id, requirementId } = await params;
  const before = await db.workflowRequirement.findFirst({ where: { id: requirementId, workProjectId: id, workProject: { tenantId: tenant.id } }, include: { workProject: { select: { companyId: true } } } });
  if (!before?.workflowStepId) return new Response('Requisito não encontrado', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status') ?? '') as WorkRequirementStatus;
  if (!statuses.has(status)) return new Response('Status inválido', { status: 400 });
  const justification = String(form.get('justification') ?? '').trim();
  if (status === 'WAIVED' && justification.length < 10) return new Response('A dispensa exige justificativa com ao menos 10 caracteres', { status: 400 });
  const updated = await db.workflowRequirement.update({
    where: { id: requirementId },
    data: {
      status,
      justification: status === 'WAIVED' || status === 'BLOCKED' ? justification || null : null,
      satisfiedAt: ['SATISFIED', 'WAIVED'].includes(status) ? new Date() : null,
    },
  });
  await refreshWorkflowStepFromRequirements(before.workflowStepId);
  await audit({ tenantId: tenant.id, companyId: before.workProject.companyId, userId: user.id, action: 'WORKFLOW_REQUIREMENT_UPDATED', entityType: 'WorkflowRequirement', entityId: requirementId, before, after: updated });
  return NextResponse.redirect(publicAppUrl(`/work-projects/${id}`), 303);
}
