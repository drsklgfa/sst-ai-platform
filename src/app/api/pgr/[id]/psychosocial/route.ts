import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { consolidatePsychosocialCampaign } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO || !env.FEATURE_PSYCHOSOCIAL_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('response.moderate');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  try {
    const assessment = await consolidatePsychosocialCampaign({ tenantId: tenant.id, workProjectId: id, campaignId: String(form.get('campaignId') ?? ''), userId: user.id });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_PSYCHOSOCIAL_CONSOLIDATED', entityType: 'PsychosocialAssessment', entityId: assessment.id, after: { workProjectId: id, campaignId: assessment.campaignId, status: assessment.status } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao consolidar avaliação', { status: 400 });
  }
}
