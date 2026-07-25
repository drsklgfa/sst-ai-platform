import type { LegacyFactStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { toPrismaJson, toPrismaNullableJson } from '@/lib/prisma-json';
import { refreshLegacyImportConflicts } from '@/lib/legacy-imports';

const statuses = new Set<LegacyFactStatus>(['NEEDS_REVIEW', 'APPROVED', 'REJECTED']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; factId: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id, factId } = await params;
  const before = await db.legacyExtractedFact.findFirst({ where: { id: factId, batchId: id, batch: { tenantId: tenant.id } }, include: { batch: { select: { companyId: true } } } });
  if (!before) return new Response('Dado não encontrado', { status: 404 });
  const form = await request.formData();
  const status = String(form.get('status') ?? '') as LegacyFactStatus;
  if (!statuses.has(status)) return new Response('Status inválido', { status: 400 });
  const edited = String(form.get('value') ?? '').trim();
  let value: unknown = before.value;
  if (edited) {
    try { value = JSON.parse(edited); } catch { value = edited; }
  }
  const updated = await db.legacyExtractedFact.update({
    where: { id: before.id },
    data: {
      status,
      value: toPrismaJson(value),
      normalizedValue: edited ? undefined : toPrismaNullableJson(before.normalizedValue),
      verifiedById: user.id,
      verifiedAt: new Date(),
    },
  });
  await refreshLegacyImportConflicts(id);
  await audit({ tenantId: tenant.id, companyId: before.batch.companyId ?? undefined, userId: user.id, action: 'LEGACY_FACT_REVIEWED', entityType: 'LegacyExtractedFact', entityId: before.id, before, after: updated });
  return NextResponse.redirect(publicAppUrl(`/legacy-imports/${id}#fact-${before.id}`), 303);
}
