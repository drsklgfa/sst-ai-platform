import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { saveFile } from '@/lib/files';
import { enqueueJob } from '@/lib/jobs';
import { toPrismaJson } from '@/lib/prisma-json';
import { validateFieldFile } from '@/domain/field/validation';
import { publicAppUrl } from '@/lib/public-url';
import { audit } from '@/lib/audit';

async function optionalContext(id: string, visit: { companyId: string; workProjectId: string | null }) {
  const [step, sector, ghe, jobFunction, workstation] = await Promise.all([
    id ? db.workflowStep.findFirst({ where: { id, workProject: { id: visit.workProjectId ?? '__none__', companyId: visit.companyId } }, select: { id: true } }) : null,
    Promise.resolve(null), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null),
  ]);
  return { step, sector, ghe, jobFunction, workstation };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('inspection.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  const form = await request.formData();
  try {
    const visit = await db.fieldVisit.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true, companyId: true, workProjectId: true } });
    if (!visit) throw new Error('Visita não encontrada');
    const workflowStepId = String(form.get('workflowStepId') ?? '') || null;
    if (workflowStepId) {
      const checked = await optionalContext(workflowStepId, visit);
      if (!checked.step) throw new Error('Etapa do trabalho inválida');
    }
    const identifiers = {
      sectorId: String(form.get('sectorId') ?? '') || null,
      gheId: String(form.get('gheId') ?? '') || null,
      jobFunctionId: String(form.get('jobFunctionId') ?? '') || null,
      workstationId: String(form.get('workstationId') ?? '') || null,
    };
    if (identifiers.sectorId && !(await db.sector.findFirst({ where: { id: identifiers.sectorId, establishment: { companyId: visit.companyId } }, select: { id: true } }))) throw new Error('Setor inválido');
    if (identifiers.gheId && !(await db.gHE.findFirst({ where: { id: identifiers.gheId, sector: { establishment: { companyId: visit.companyId } } }, select: { id: true } }))) throw new Error('GHE inválido');
    if (identifiers.jobFunctionId && !(await db.jobFunction.findFirst({ where: { id: identifiers.jobFunctionId, ghe: { sector: { establishment: { companyId: visit.companyId } } } }, select: { id: true } }))) throw new Error('Função inválida');
    if (identifiers.workstationId && !(await db.workstation.findFirst({ where: { id: identifiers.workstationId, ghe: { sector: { establishment: { companyId: visit.companyId } } } }, select: { id: true } }))) throw new Error('Posto inválido');

    const inputKind = String(form.get('kind') ?? 'NOTE').toUpperCase();
    const title = String(form.get('title') ?? '').trim().slice(0, 180) || 'Registro de campo';
    const caption = String(form.get('caption') ?? '').trim().slice(0, 10000) || null;
    const textValue = String(form.get('textValue') ?? '').trim().slice(0, 50000) || null;
    const numericRaw = String(form.get('numericValue') ?? '').replace(',', '.').trim();
    const numericValue = numericRaw ? Number(numericRaw) : null;
    const unit = String(form.get('unit') ?? '').trim().slice(0, 40) || null;
    const selected = [form.get('cameraFile'), form.get('audioFile'), form.get('file')].find((item) => item instanceof File && item.size > 0);
    const file = selected;
    let fileObjectId: string | null = null;
    let kind = inputKind;
    let queued = false;
    if (file instanceof File && file.size > 0) {
      const rule = validateFieldFile(file);
      kind = rule.kind;
      const saved = await saveFile({ tenantId: tenant.id, companyId: visit.companyId, originalName: file.name, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()), createdById: user.id, metadata: { source: 'FIELD_CAPTURE', fieldVisitId: visit.id, personalDataDeclared: form.get('personalDataDeclared') === 'yes' } });
      fileObjectId = saved.id;
      queued = env.FEATURE_MULTIMODAL_INPUT && ['PHOTO', 'AUDIO', 'DOCUMENT'].includes(kind);
    } else if (kind === 'MEASUREMENT') {
      if (!Number.isFinite(numericValue)) throw new Error('Informe um valor numérico válido');
    } else if (!textValue && !caption) throw new Error('Informe uma nota, medição ou arquivo');
    const position = await db.fieldCapture.count({ where: { fieldVisitId: visit.id } });
    const capture = await db.fieldCapture.create({
      data: {
        fieldVisitId: visit.id,
        workProjectId: visit.workProjectId,
        workflowStepId,
        ...identifiers,
        fileObjectId,
        kind: kind as 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'NOTE' | 'MEASUREMENT',
        status: queued ? 'QUEUED' : 'READY',
        title,
        caption,
        textValue,
        numericValue: Number.isFinite(numericValue) ? numericValue : null,
        unit,
        position,
        capturedById: user.id,
        metadata: toPrismaJson({ personalDataDeclared: form.get('personalDataDeclared') === 'yes', analyzeWithAI: queued }),
      },
    });
    if (queued) await enqueueJob(tenant.id, 'FIELD_ANALYZE_CAPTURE', { captureId: capture.id });
    if (visit.workProjectId && !fileObjectId) await db.workflowArtifact.create({ data: { workProjectId: visit.workProjectId, workflowStepId, kind: 'FIELD_EVIDENCE', title, entityType: 'FieldCapture', entityId: capture.id, metadata: toPrismaJson({ fieldVisitId: visit.id, captureKind: kind }) } });
    await audit({ tenantId: tenant.id, companyId: visit.companyId, userId: user.id, action: 'FIELD_CAPTURE_CREATED', entityType: 'FieldCapture', entityId: capture.id, after: { fieldVisitId: visit.id, kind, queued } });
    return NextResponse.redirect(publicAppUrl(`/field-visits/${visit.id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`/field-visits/${id}?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
