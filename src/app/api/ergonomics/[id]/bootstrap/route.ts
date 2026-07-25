import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getOrCreateErgonomicsProgram } from '@/lib/ergonomics';
import { publicAppUrl } from '@/lib/public-url';
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_ERGONOMICS) return new Response('Módulo desativado', { status: 404 });
  const auth = await authorizeTenantApi('ergonomics.manage'); if (auth instanceof Response) return auth;
  const { id } = await params;
  try { const row = await getOrCreateErgonomicsProgram({ tenantId: auth.tenant.id, workProjectId: id, userId: auth.user.id }); await audit({ tenantId: auth.tenant.id, userId: auth.user.id, companyId: row.companyId, action: 'ERGONOMICS_PROGRAM_INITIALIZED', entityType: 'ErgonomicsProgram', entityId: row.id }); return NextResponse.redirect(publicAppUrl(`/ergonomics/${id}`), 303); }
  catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao iniciar ergonomia', { status: 400 }); }
}
