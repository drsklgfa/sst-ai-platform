import { sha256 } from '@/lib/crypto';
import { db } from '@/lib/db';
import { checkRateLimit, requestAddress } from '@/lib/rate-limit';
import { storage } from '@/lib/storage';
import { publicTrainingEnrollment } from '@/lib/training';
import { env } from '@/lib/env';

export async function GET(request: Request, { params }: { params: Promise<{ token: string; lessonId: string }> }) {
  if (!env.FEATURE_CORPORATE_UNIVERSITY) return new Response('Módulo desativado', { status: 404 });
  const { token, lessonId } = await params;
  const limit = checkRateLimit(`training-material:${sha256(token)}:${requestAddress(request.headers)}`, 120, 60 * 60_000); if (!limit.allowed) return new Response('Muitas solicitações', { status: 429 });
  const enrollment = await publicTrainingEnrollment(token);
  if (!enrollment) return new Response('Acesso inválido ou expirado', { status: 404 });
  const lesson = await db.trainingLesson.findFirst({ where: { id: lessonId, module: { courseId: enrollment.courseId } }, include: { file: true } });
  if (!lesson?.file) return new Response('Material não encontrado', { status: 404 });
  try { return new Response(await storage.get(lesson.file.storageKey), { headers: { 'content-type': lesson.file.mimeType, 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(lesson.file.originalName)}`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } }); }
  catch { return new Response('Material não encontrado', { status: 404 }); }
}
