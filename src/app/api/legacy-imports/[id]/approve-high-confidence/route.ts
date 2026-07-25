import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { refreshLegacyImportConflicts } from '@/lib/legacy-imports';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const batch = await db.legacyImportBatch.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true, companyId: true } });
  if (!batch) return new Response('Importação não encontrada', { status: 404 });
  const result = await db.legacyExtractedFact.updateMany({
    where: { batchId: id, status: { in: ['EXTRACTED', 'NEEDS_REVIEW'] }, confidence: { gte: 85 }, domain: { not: 'MEDICAL_SENSITIVE' } },
    data: { status: 'APPROVED', verifiedById: user.id, verifiedAt: new Date() },
  });
  await refreshLegacyImportConflicts(id);
  await audit({ tenantId: tenant.id, companyId: batch.companyId ?? undefined, userId: user.id, action: 'LEGACY_FACTS_BULK_APPROVED', entityType: 'LegacyImportBatch', entityId: id, after: { approved: result.count, threshold: 85 } });
  return NextResponse.redirect(publicAppUrl(`/legacy-imports/${id}`), 303);
}
