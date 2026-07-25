import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { revertChangeSet } from '@/lib/ai-tools';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_AI_COPILOT) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user, membership } = authorization;
  const { id } = await params;
  const changeSet = await db.changeSet.findFirst({ where: { id, toolExecutions: { some: { tenantId: tenant.id } } }, include: { toolExecutions: { where: { tenantId: tenant.id }, take: 1 } } });
  if (!changeSet) return new Response('Alteração não encontrada', { status: 404 });
  const execution = changeSet.toolExecutions[0];
  const redirectPath = execution?.aiThreadId ? `/copilot/${execution.aiThreadId}` : changeSet.workProjectId ? `/work-projects/${changeSet.workProjectId}` : '/copilot';
  try {
    await revertChangeSet(id, { tenantId: tenant.id, userId: user.id, role: membership.role, permissionOverrides: membership.permissions, autonomy: 'SUPERVISED_AUTONOMY', dataPolicy: 'PROFESSIONAL', aiThreadId: execution?.aiThreadId, workProjectId: changeSet.workProjectId });
    return NextResponse.redirect(publicAppUrl(redirectPath), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`${redirectPath}?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
