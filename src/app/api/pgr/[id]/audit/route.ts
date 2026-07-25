import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { runPgrAudit } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  try {
    const result = await runPgrAudit({ tenantId: tenant.id, workProjectId: id, userId: user.id });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_AUDIT_RUN', entityType: 'PgrAuditRun', entityId: result.id, after: { workProjectId: id, status: result.status, score: result.score } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha na auditoria', { status: 400 });
  }
}
