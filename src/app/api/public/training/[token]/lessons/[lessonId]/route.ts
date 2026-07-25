import { sha256 } from '@/lib/crypto';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';
import { recordPublicTrainingLessonProgress } from '@/lib/training';
import { publicAppUrl } from '@/lib/public-url';
import { env } from '@/lib/env';

export async function POST(request: Request, { params }: { params: Promise<{ token: string; lessonId: string }> }) {
  if (!env.FEATURE_CORPORATE_UNIVERSITY) return new Response('Módulo desativado', { status: 404 });
  const { token, lessonId } = await params;
  const limit = checkRateLimit(`training-lesson:${sha256(token)}:${requestAddress(request.headers)}`, 120, 60 * 60_000);
  if (!limit.allowed) return new Response('Muitas solicitações', { status: 429 });
  const form = await request.formData();
  try {
    await recordPublicTrainingLessonProgress({ token, lessonId, completed: String(form.get('completed') ?? 'true') === 'true', activeSeconds: Number(form.get('activeSeconds') ?? 0), positionSeconds: Number(form.get('positionSeconds') ?? 0), ipHash: sha256(requestAddress(request.headers)) });
    return Response.redirect(publicAppUrl(`/learn/${token}`), 303);
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao salvar progresso', { status: 400 }); }
}
