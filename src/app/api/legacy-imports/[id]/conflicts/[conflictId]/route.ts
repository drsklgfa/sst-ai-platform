import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { toPrismaJson } from '@/lib/prisma-json';
import { refreshLegacyImportConflicts } from '@/lib/legacy-imports';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; conflictId: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id, conflictId } = await params;
  const conflict = await db.legacyImportConflict.findFirst({ where: { id: conflictId, batchId: id, batch: { tenantId: tenant.id } } });
  if (!conflict) return new Response('Conflito não encontrado', { status: 404 });
  const factIds = Array.isArray(conflict.factIds) ? conflict.factIds.filter((item): item is string => typeof item === 'string') : [];
  const form = await request.formData();
  const selectedFactId = String(form.get('selectedFactId') ?? '');
  const ignore = form.get('ignore') === '1';
  if (!ignore && !factIds.includes(selectedFactId)) return new Response('Seleção inválida', { status: 400 });
  if (ignore) {
    await db.legacyImportConflict.update({ where: { id: conflict.id }, data: { status: 'IGNORED', resolvedById: user.id, resolvedAt: new Date(), resolution: toPrismaJson({ ignored: true }) } });
  } else {
    await db.$transaction([
      db.legacyExtractedFact.update({ where: { id: selectedFactId }, data: { status: 'APPROVED', verifiedById: user.id, verifiedAt: new Date() } }),
      db.legacyExtractedFact.updateMany({ where: { id: { in: factIds.filter((factId) => factId !== selectedFactId) } }, data: { status: 'REJECTED', verifiedById: user.id, verifiedAt: new Date() } }),
      db.legacyImportConflict.update({ where: { id: conflict.id }, data: { status: 'RESOLVED', resolvedById: user.id, resolvedAt: new Date(), resolution: toPrismaJson({ selectedFactId }) } }),
    ]);
  }
  await refreshLegacyImportConflicts(id);
  await audit({ tenantId: tenant.id, userId: user.id, action: 'LEGACY_CONFLICT_RESOLVED', entityType: 'LegacyImportConflict', entityId: conflict.id, after: { selectedFactId: ignore ? null : selectedFactId, ignored: ignore } });
  return NextResponse.redirect(publicAppUrl(`/legacy-imports/${id}#conflicts`), 303);
}
