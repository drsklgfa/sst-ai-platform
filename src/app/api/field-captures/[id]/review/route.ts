import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { publicAppUrl } from '@/lib/public-url';
import { audit } from '@/lib/audit';
import { toPrismaJson } from '@/lib/prisma-json';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  const operation = String(form.get('operation') ?? 'approve');
  const capture = await db.fieldCapture.findFirst({ where: { id, fieldVisit: { tenantId: tenant.id } }, include: { fieldVisit: true } });
  if (!capture) return new Response('Evidência não encontrada', { status: 404 });
  const updated = await db.fieldCapture.update({
    where: { id: capture.id },
    data: {
      status: operation === 'reject' ? 'REJECTED' : 'READY',
      caption: String(form.get('caption') ?? capture.caption ?? '').trim().slice(0, 10000) || null,
      transcript: String(form.get('transcript') ?? capture.transcript ?? '').trim().slice(0, 50000) || null,
      metadata: toPrismaJson({ ...(capture.metadata && typeof capture.metadata === 'object' ? capture.metadata as object : {}), reviewedById: user.id, reviewedAt: new Date().toISOString(), reviewOperation: operation }),
    },
  });
  await audit({ tenantId: tenant.id, companyId: capture.fieldVisit.companyId, userId: user.id, action: operation === 'reject' ? 'FIELD_CAPTURE_REJECTED' : 'FIELD_CAPTURE_APPROVED', entityType: 'FieldCapture', entityId: capture.id, before: { status: capture.status }, after: { status: updated.status } });
  return NextResponse.redirect(publicAppUrl(`/field-visits/${capture.fieldVisitId}`), 303);
}
