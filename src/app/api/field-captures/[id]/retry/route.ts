import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { enqueueJob } from '@/lib/jobs';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS || !env.FEATURE_MULTIMODAL_INPUT) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant } = authorization;
  const { id } = await params;
  const capture = await db.fieldCapture.findFirst({ where: { id, fieldVisit: { tenantId: tenant.id }, fileObjectId: { not: null } }, select: { id: true, fieldVisitId: true } });
  if (!capture) return new Response('Evidência não encontrada', { status: 404 });
  await db.fieldCapture.update({ where: { id: capture.id }, data: { status: 'QUEUED', error: null } });
  await enqueueJob(tenant.id, 'FIELD_ANALYZE_CAPTURE', { captureId: capture.id });
  return NextResponse.redirect(publicAppUrl(`/field-visits/${capture.fieldVisitId}`), 303);
}
