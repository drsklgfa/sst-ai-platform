import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { workflowDefinitionFor } from '@/domain/workflows/templates';
import { createWorkProjectFromDefinition } from '@/lib/work-projects';

export async function POST(request: Request) {
  if (!env.FEATURE_V10_WORKS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const form = await request.formData();
  const companyId = String(form.get('companyId') ?? '');
  const serviceType = String(form.get('serviceType') ?? '').trim().toUpperCase();
  const company = await db.company.findFirst({ where: { id: companyId, tenantId: tenant.id, status: 'ACTIVE' } });
  if (!company) return new Response('Empresa inválida', { status: 400 });
  let definition;
  try { definition = workflowDefinitionFor(serviceType); } catch (error) { return new Response(error instanceof Error ? error.message : 'Tipo inválido', { status: 400 }); }
  const customTitle = String(form.get('title') ?? '').trim();
  const dueRaw = String(form.get('dueAt') ?? '').trim();
  const dueAt = dueRaw ? new Date(`${dueRaw}T12:00:00.000Z`) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) return new Response('Prazo inválido', { status: 400 });
  const title = customTitle || `${definition.name} — ${company.tradeName ?? company.legalName}`;
  if (title.length > 200) return new Response('Título muito longo', { status: 400 });

  const project = await createWorkProjectFromDefinition({
    tenantId: tenant.id,
    companyId: company.id,
    serviceType: definition.serviceType,
    title,
    responsibleUserId: user.id,
    dueAt,
  });
  await audit({ tenantId: tenant.id, companyId: company.id, userId: user.id, action: 'WORK_PROJECT_CREATED', entityType: 'WorkProject', entityId: project.id, after: { serviceType: project.serviceType, title: project.title, workflowCode: definition.code, workflowVersion: definition.version } });
  return NextResponse.redirect(publicAppUrl(`/work-projects/${project.id}`), 303);
}
