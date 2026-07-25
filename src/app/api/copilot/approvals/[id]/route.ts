import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { loadActiveAIConfiguration } from '@/lib/ai-config';
import { runToolExecution } from '@/lib/ai-tools';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_AI_COPILOT) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user, membership } = authorization;
  const { id } = await params;
  const approval = await db.approvalRequest.findFirst({
    where: { id, toolExecutions: { some: { tenantId: tenant.id } } },
    include: { toolExecutions: { where: { tenantId: tenant.id }, orderBy: { createdAt: 'asc' } }, changeSet: true },
  });
  if (!approval) return new Response('Aprovação não encontrada', { status: 404 });
  if (approval.status !== 'PENDING') return new Response('Aprovação já decidida', { status: 409 });
  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'reject');
  const note = String(form.get('note') ?? '').trim().slice(0, 4000);
  const execution = approval.toolExecutions[0];
  const thread = execution?.aiThreadId ? await db.aIThread.findFirst({ where: { id: execution.aiThreadId, tenantId: tenant.id } }) : null;
  const redirectPath = thread ? `/copilot/${thread.id}` : approval.workProjectId ? `/work-projects/${approval.workProjectId}` : '/copilot';

  if (operation === 'reject') {
    await db.$transaction([
      db.approvalRequest.update({ where: { id: approval.id }, data: { status: 'REJECTED', reviewedById: user.id, decisionNote: note || null, decidedAt: new Date() } }),
      db.aIToolExecution.updateMany({ where: { approvalRequestId: approval.id, tenantId: tenant.id, status: 'WAITING_APPROVAL' }, data: { status: 'CANCELLED', error: note || 'Ação rejeitada pelo usuário', completedAt: new Date() } }),
      ...(approval.changeSetId ? [db.changeSet.update({ where: { id: approval.changeSetId }, data: { status: 'REJECTED', metadata: { decisionNote: note || null } } })] : []),
    ]);
    await audit({ tenantId: tenant.id, userId: user.id, action: 'AI_TOOL_REJECTED', entityType: 'ApprovalRequest', entityId: approval.id, before: approval, after: { status: 'REJECTED', note } });
    return NextResponse.redirect(publicAppUrl(redirectPath), 303);
  }
  if (operation !== 'approve') return new Response('Operação inválida', { status: 400 });
  if (!execution || !thread) return new Response('Execução vinculada não encontrada', { status: 409 });
  const configuration = await loadActiveAIConfiguration(tenant.id, thread.provider === 'OPENAI' || thread.provider === 'GEMINI' ? thread.provider : undefined);
  if (!configuration) return new Response('Provedor de IA indisponível', { status: 409 });
  await db.approvalRequest.update({ where: { id: approval.id }, data: { status: 'APPROVED', reviewedById: user.id, decisionNote: note || null, decidedAt: new Date() } });
  try {
    await runToolExecution(execution.id, { tenantId: tenant.id, userId: user.id, role: membership.role, permissionOverrides: membership.permissions, autonomy: thread.autonomy, dataPolicy: configuration.settings.dataPolicy, aiThreadId: thread.id, workProjectId: execution.workProjectId });
    await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'TOOL', toolName: execution.toolName, content: JSON.stringify({ status: 'APPROVED_AND_EXECUTED', approvalRequestId: approval.id }) } });
    return NextResponse.redirect(publicAppUrl(redirectPath), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`${redirectPath}?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
