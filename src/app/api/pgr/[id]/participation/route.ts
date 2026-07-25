import { NextResponse } from 'next/server';
import type { WorkerParticipationKind } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { registerPgrParticipation } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  try {
    const record = await registerPgrParticipation({
      tenantId: tenant.id,
      workProjectId: id,
      userId: user.id,
      kind: String(form.get('kind') ?? 'CONSULTATION') as WorkerParticipationKind,
      title: String(form.get('title') ?? '').trim(),
      participantCount: Number(form.get('participantCount') ?? 0),
      groups: String(form.get('groups') ?? '').split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean),
      summary: String(form.get('summary') ?? '').trim(),
      outcomes: String(form.get('outcomes') ?? '').split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean),
      confidential: form.get('confidential') === 'on',
    });
    if (record.title.length < 3) return new Response('Título da participação é obrigatório', { status: 400 });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_PARTICIPATION_RECORDED', entityType: 'PgrParticipationRecord', entityId: record.id, after: { workProjectId: id, kind: record.kind, participantCount: record.participantCount } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao registrar participação', { status: 400 });
  }
}
