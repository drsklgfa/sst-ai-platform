import { NextResponse } from 'next/server';
import type { PgrHazardCategory } from '@prisma/client';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { savePgrRisk } from '@/lib/pgr';
import { publicAppUrl } from '@/lib/public-url';

const lines = (value: FormDataEntryValue | null) => String(value ?? '').split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
const number = (form: FormData, name: string, fallback: number) => {
  const raw = String(form.get(name) ?? '').trim();
  return raw ? Number(raw) : fallback;
};
const optionalNumber = (form: FormData, name: string) => {
  const raw = String(form.get(name) ?? '').trim();
  return raw ? Number(raw) : null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  try {
    const row = await savePgrRisk({
      tenantId: tenant.id,
      workProjectId: id,
      userId: user.id,
      gheId: String(form.get('gheId') ?? '').trim() || null,
      sourceType: 'MANUAL',
      risk: {
        code: String(form.get('code') ?? ''),
        category: String(form.get('category') ?? 'OTHER') as PgrHazardCategory,
        hazard: String(form.get('hazard') ?? ''),
        source: String(form.get('source') ?? '').trim() || undefined,
        circumstances: String(form.get('circumstances') ?? '').trim() || undefined,
        possibleHarms: lines(form.get('possibleHarms')),
        exposedGroups: lines(form.get('exposedGroups')),
        exposedCount: number(form, 'exposedCount', 0),
        frequency: String(form.get('frequency') ?? '').trim() || undefined,
        duration: String(form.get('duration') ?? '').trim() || undefined,
        existingControls: lines(form.get('existingControls')),
        severity: number(form, 'severity', 1),
        probability: number(form, 'probability', 1),
        exposure: number(form, 'exposure', 1),
        residualSeverity: optionalNumber(form, 'residualSeverity'),
        residualProbability: optionalNumber(form, 'residualProbability'),
        residualExposure: optionalNumber(form, 'residualExposure'),
      },
    });
    await audit({ tenantId: tenant.id, userId: user.id, action: 'PGR_RISK_SAVED', entityType: 'PgrRiskAssessment', entityId: row.id, after: { workProjectId: id, code: row.code, level: row.initialLevel } });
    return NextResponse.redirect(publicAppUrl(`/pgr/${id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao salvar risco', { status: 400 });
  }
}
