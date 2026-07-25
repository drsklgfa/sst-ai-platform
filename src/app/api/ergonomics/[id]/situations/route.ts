import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { saveErgonomicWorkSituation } from '@/lib/ergonomics';
import { publicAppUrl } from '@/lib/public-url';

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? '')
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

const describedObject = (value: FormDataEntryValue | null) => {
  const description = String(value ?? '').trim();
  return description ? { description } : {};
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_ERGONOMICS) return new Response('Módulo desativado', { status: 404 });

  const auth = await authorizeTenantApi('ergonomics.manage');
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const form = await request.formData();

  try {
    const row = await saveErgonomicWorkSituation({
      tenantId: auth.tenant.id,
      workProjectId: id,
      userId: auth.user.id,
      title: String(form.get('title') ?? ''),
      gheId: String(form.get('gheId') ?? '') || null,
      jobFunctionId: String(form.get('jobFunctionId') ?? '') || null,
      workstationId: String(form.get('workstationId') ?? '') || null,
      prescribedWork: String(form.get('prescribedWork') ?? '') || null,
      actualWork: String(form.get('actualWork') ?? '') || null,
      activities: lines(form.get('activities')),
      variability: lines(form.get('variability')),
      strategies: lines(form.get('strategies')),
      constraints: lines(form.get('constraints')),
      workOrganization: describedObject(form.get('workOrganization')),
      cognitiveDemands: describedObject(form.get('cognitiveDemands')),
      psychosocialFactors: describedObject(form.get('psychosocialFactors')),
      environmentalConditions: describedObject(form.get('environmentalConditions')),
      population: describedObject(form.get('population')),
      taskDurationMinutes: Number(form.get('taskDurationMinutes') || 0) || null,
      cyclesPerHour: Number(form.get('cyclesPerHour') || 0) || null,
      breaks: String(form.get('breaks') ?? '') || null,
      shift: String(form.get('shift') ?? '') || null,
    });

    await audit({
      tenantId: auth.tenant.id,
      userId: auth.user.id,
      action: 'ERGONOMIC_WORK_SITUATION_RECORDED',
      entityType: 'ErgonomicWorkSituation',
      entityId: row.id,
    });

    return NextResponse.redirect(publicAppUrl(`/ergonomics/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao registrar situação', { status: 400 });
  }
}
