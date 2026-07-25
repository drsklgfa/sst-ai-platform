import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { toPrismaJson } from '@/lib/prisma-json';
import { audit } from '@/lib/audit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  const latitude = Number(form.get('latitude'));
  const longitude = Number(form.get('longitude'));
  const accuracy = Number(form.get('accuracy'));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return new Response('Coordenadas inválidas', { status: 400 });
  const visit = await db.fieldVisit.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true, companyId: true } });
  if (!visit) return new Response('Visita não encontrada', { status: 404 });
  const location = { latitude, longitude, accuracy: Number.isFinite(accuracy) ? Math.max(0, accuracy) : null, capturedAt: new Date().toISOString(), source: 'BROWSER_GEOLOCATION' };
  await db.fieldVisit.update({ where: { id: visit.id }, data: { location: toPrismaJson(location) } });
  await audit({ tenantId: tenant.id, companyId: visit.companyId, userId: user.id, action: 'FIELD_VISIT_LOCATION_CAPTURED', entityType: 'FieldVisit', entityId: visit.id, after: location });
  return Response.json({ ok: true });
}
