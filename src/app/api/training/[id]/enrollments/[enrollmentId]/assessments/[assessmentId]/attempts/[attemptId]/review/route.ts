import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { reviewTrainingAssessmentAttempt } from '@/lib/training';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string; assessmentId: string; attemptId: string }> }) {
  if (!env.FEATURE_TRAINING_ASSESSMENTS) return new Response('Módulo desativado', { status: 404 });
  const auth = await authorizeTenantApi('training.evaluate'); if (auth instanceof Response) return auth;
  const { id, attemptId } = await params; const form = await request.formData();
  try {
    const row = await reviewTrainingAssessmentAttempt({ tenantId: auth.tenant.id, attemptId, reviewerUserId: auth.user.id, score: Number(form.get('score')), passed: String(form.get('decision')) === 'approve', feedback: String(form.get('feedback') ?? '') || null });
    await audit({ tenantId: auth.tenant.id, userId: auth.user.id, action: 'TRAINING_ASSESSMENT_REVIEWED', entityType: 'TrainingAssessmentAttempt', entityId: row.id, after: { status: row.status, score: row.score } });
    return NextResponse.redirect(publicAppUrl(`/training/${id}`), 303);
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Falha na revisão', { status: 400 }); }
}
