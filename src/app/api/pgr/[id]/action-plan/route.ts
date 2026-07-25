import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { generatePgrActionPlan } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('action.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  try {
    const result = await generatePgrActionPlan({ tenantId: tenant.id, workProjectId: id, userId: user.id });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_ACTION_PLAN_GENERATED', entityType: 'ActionPlan', entityId: result.plan.id, after: { workProjectId: id, eligible: result.eligible, created: result.created } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao gerar plano de ação', { status: 400 });
  }
}
