import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getOrCreatePgrProgram } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  try {
    const program = await getOrCreatePgrProgram({ tenantId: tenant.id, workProjectId: id, userId: user.id });
    await audit({ tenantId: tenant.id, companyId: program.companyId, userId: user.id, action: 'PGR_PROGRAM_INITIALIZED', entityType: 'PgrProgram', entityId: program.id, after: { workProjectId: id } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao iniciar PGR', { status: 400 });
  }
}
