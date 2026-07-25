import { sha256 } from '@/lib/crypto';
import { db } from '@/lib/db';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';
import { publicTrainingEnrollment, submitPublicTrainingAssessment } from '@/lib/training';
import { publicAppUrl } from '@/lib/public-url';
import { env } from '@/lib/env';

export async function POST(request: Request, { params }: { params: Promise<{ token: string; assessmentId: string }> }) {
  if (!env.FEATURE_CORPORATE_UNIVERSITY || !env.FEATURE_TRAINING_ASSESSMENTS) return new Response('Módulo desativado', { status: 404 });
  const { token, assessmentId } = await params;
  const limit = checkRateLimit(`training-assessment:${sha256(token)}:${requestAddress(request.headers)}`, 20, 60 * 60_000);
  if (!limit.allowed) return new Response('Muitas tentativas. Aguarde.', { status: 429 });
  const enrollment = await publicTrainingEnrollment(token); if (!enrollment) return new Response('Acesso inválido ou expirado', { status: 404 });
  const assessment = await db.trainingAssessment.findFirst({ where: { id: assessmentId, courseId: enrollment.courseId, active: true }, include: { questions: { where: { active: true } } } });
  if (!assessment) return new Response('Avaliação indisponível', { status: 404 });
  const form = await request.formData(); const answers: Record<string, unknown> = {};
  for (const question of assessment.questions) {
    const key = `q_${question.id}`;
    answers[question.id] = question.type === 'MULTIPLE_CHOICE' ? form.getAll(key).map(String) : String(form.get(key) ?? '');
    if (question.type === 'TRUE_FALSE') answers[question.id] = String(form.get(key)) === 'true';
  }
  try { await submitPublicTrainingAssessment({ token, assessmentId, answers }); return Response.redirect(publicAppUrl(`/learn/${token}`), 303); }
  catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao enviar avaliação', { status: 400 }); }
}
