import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { createFieldVisit } from '@/lib/field-operations';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request) {
  if (!env.FEATURE_FIELD_OPERATIONS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  try {
    const visit = await createFieldVisit({
      tenantId: tenant.id,
      userId: user.id,
      companyId: String(form.get('companyId') ?? ''),
      workProjectId: String(form.get('workProjectId') ?? '') || null,
      inspectionId: String(form.get('inspectionId') ?? '') || null,
      title: String(form.get('title') ?? ''),
    });
    return NextResponse.redirect(publicAppUrl(`/field-visits/${visit.id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`/field-visits?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
