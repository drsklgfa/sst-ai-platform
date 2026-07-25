import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { enqueueJob } from '@/lib/jobs';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant } = authorization;
  const { id, documentId } = await params;
  const document = await db.legacyImportDocument.findFirst({ where: { id: documentId, batchId: id, batch: { tenantId: tenant.id } } });
  if (!document) return new Response('Documento não encontrado', { status: 404 });
  await db.legacyImportDocument.update({ where: { id: document.id }, data: { status: 'QUEUED', error: null } });
  await db.legacyImportBatch.update({ where: { id }, data: { status: 'QUEUED', error: null } });
  await enqueueJob(tenant.id, 'LEGACY_ANALYZE_DOCUMENT', { documentId: document.id });
  return NextResponse.redirect(publicAppUrl(`/legacy-imports/${id}`), 303);
}
