import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { getOrCreateExposureProgram } from '@/lib/exposures';
import { publicAppUrl } from '@/lib/public-url';
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_EXPOSURE_CORE) return new Response('Módulo desativado', { status: 404 });
  const auth = await authorizeTenantApi('exposure.manage'); if (auth instanceof Response) return auth;
  const { id } = await params;
  try { const row = await getOrCreateExposureProgram({ tenantId: auth.tenant.id, workProjectId: id, userId: auth.user.id }); await audit({ tenantId: auth.tenant.id, companyId: row.companyId, userId: auth.user.id, action: 'EXPOSURE_PROGRAM_INITIALIZED', entityType: 'OccupationalExposureProgram', entityId: row.id, after: { workProjectId: id, purpose: row.purpose } }); return NextResponse.redirect(publicAppUrl(`/exposures/${id}`), 303); } catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao iniciar programa', { status: 400 }); }
}
