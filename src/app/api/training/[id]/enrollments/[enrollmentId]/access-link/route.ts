import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { issueTrainingAccessToken } from '@/lib/training';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  if (!env.FEATURE_CORPORATE_UNIVERSITY) return new Response('Módulo desativado', { status: 404 });
  const auth = await authorizeTenantApi('training.manage'); if (auth instanceof Response) return auth;
  const { id, enrollmentId } = await params; const form = await request.formData();
  try {
    const result = await issueTrainingAccessToken({ tenantId: auth.tenant.id, enrollmentId, expiresInDays: Number(form.get('expiresInDays') ?? 90) });
    await audit({ tenantId: auth.tenant.id, userId: auth.user.id, action: 'TRAINING_ACCESS_LINK_ISSUED', entityType: 'TrainingEnrollment', entityId: enrollmentId, after: { expiresAt: result.expiresAt } });
    const url = new URL(publicAppUrl(`/training/${id}`)); url.searchParams.set('accessToken', result.token); url.searchParams.set('accessEnrollment', enrollmentId);
    return NextResponse.redirect(url, 303);
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao gerar acesso', { status: 400 }); }
}
