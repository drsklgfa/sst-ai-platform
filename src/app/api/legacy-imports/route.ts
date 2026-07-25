import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { saveFile } from '@/lib/files';
import { enqueueJob } from '@/lib/jobs';
import { publicAppUrl } from '@/lib/public-url';
import { toPrismaJson } from '@/lib/prisma-json';
import { inferLegacyMimeType, isAcceptedLegacyFile, LEGACY_MAX_FILES_PER_BATCH, LEGACY_TARGET_SERVICES } from '@/domain/legacy-import/catalog';

export async function POST(request: Request) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const title = String(form.get('title') ?? '').trim();
  if (title.length < 3 || title.length > 200) return new Response('Informe um título entre 3 e 200 caracteres', { status: 400 });
  const companyId = String(form.get('companyId') ?? '').trim() || null;
  if (companyId) {
    const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id, status: 'ACTIVE' }, select: { id: true } });
    if (!company) return new Response('Empresa inválida', { status: 400 });
  }
  const allowedTargets = new Set<string>(LEGACY_TARGET_SERVICES);
  const targetServices = form.getAll('targetServices').map(String).map((item) => item.toUpperCase()).filter((item) => allowedTargets.has(item));
  if (!targetServices.length) return new Response('Selecione ao menos um serviço de destino', { status: 400 });
  const files = form.getAll('files').filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return new Response('Envie ao menos um documento', { status: 400 });
  if (files.length > LEGACY_MAX_FILES_PER_BATCH) return new Response(`O limite é de ${LEGACY_MAX_FILES_PER_BATCH} arquivos por importação`, { status: 400 });
  const invalid = files.find((file) => !isAcceptedLegacyFile(file));
  if (invalid) return new Response(`Arquivo não aceito ou acima do limite: ${invalid.name}`, { status: 400 });

  const batch = await db.legacyImportBatch.create({
    data: {
      tenantId: tenant.id,
      companyId,
      title,
      status: 'DRAFT',
      targetServices: toPrismaJson(targetServices),
      autoCreateCompany: form.get('autoCreateCompany') === 'on',
      createdById: user.id,
      metadata: toPrismaJson({ originalFileCount: files.length, documentsAnonymized: form.get('documentsAnonymized') === 'on' }),
    },
  });
  try {
    for (const source of files) {
      const data = Buffer.from(await source.arrayBuffer());
      const mimeType = inferLegacyMimeType(source.name, source.type);
      const file = await saveFile({
        tenantId: tenant.id,
        companyId: companyId ?? undefined,
        originalName: source.name,
        mimeType,
        data,
        createdById: user.id,
        metadata: { legacyImportBatchId: batch.id, originalMimeType: source.type || null },
      });
      const document = await db.legacyImportDocument.create({ data: { batchId: batch.id, fileObjectId: file.id, status: 'QUEUED' } });
      await enqueueJob(tenant.id, 'LEGACY_ANALYZE_DOCUMENT', { documentId: document.id });
    }
    await db.legacyImportBatch.update({ where: { id: batch.id }, data: { status: 'QUEUED' } });
    await audit({ tenantId: tenant.id, companyId: companyId ?? undefined, userId: user.id, action: 'LEGACY_IMPORT_CREATED', entityType: 'LegacyImportBatch', entityId: batch.id, after: { title, targetServices, files: files.map((file) => file.name) } });
    return NextResponse.redirect(publicAppUrl(`/legacy-imports/${batch.id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.legacyImportBatch.update({ where: { id: batch.id }, data: { status: 'FAILED', error: message } });
    throw error;
  }
}
