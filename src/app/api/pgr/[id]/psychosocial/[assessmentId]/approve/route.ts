import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { approvePsychosocialAssessment } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_: Request, { params }: { params: Promise<{ id: string; assessmentId: string }> }) {
  if (!env.FEATURE_PGR_GRO || !env.FEATURE_PSYCHOSOCIAL_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('response.moderate');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id, assessmentId } = await params;
  try {
    const assessment = await approvePsychosocialAssessment({ tenantId: tenant.id, workProjectId: id, assessmentId, userId: user.id });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_PSYCHOSOCIAL_APPROVED', entityType: 'PsychosocialAssessment', entityId: assessment.id, after: { status: assessment.status } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao aprovar avaliação', { status: 400 });
  }
}
