import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { setFieldVisitStatus } from '@/lib/field-operations';
import { publicAppUrl } from '@/lib/public-url';

const allowed = new Set(['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REVIEWED', 'CANCELLED']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  const status = String(form.get('status') ?? 'IN_PROGRESS');
  if (!allowed.has(status)) return new Response('Status inválido', { status: 400 });
  try {
    await setFieldVisitStatus({
      tenantId: tenant.id,
      userId: user.id,
      visitId: id,
      status: status as 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REVIEWED' | 'CANCELLED',
      checklistCode: String(form.get('checklistCode') ?? '') || undefined,
      checklistCompleted: String(form.get('completed') ?? 'true') !== 'false',
      notes: String(form.get('notes') ?? '') || undefined,
    });
    return NextResponse.redirect(publicAppUrl(`/field-visits/${id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`/field-visits/${id}?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
