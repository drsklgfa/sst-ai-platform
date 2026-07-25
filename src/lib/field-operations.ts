import { db } from './db';
import { storage } from './storage';
import { loadActiveAIConfiguration } from './ai-config';
import { createAIProviderClient } from './integrations/ai';
import { toPrismaJson } from './prisma-json';
import { audit } from './audit';
import { checklistProgress, fieldChecklistFor, updateChecklist } from '@/domain/field/checklists';

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return { summary: text.trim() }; }
}

export async function createFieldVisit(input: { tenantId: string; userId: string; companyId: string; workProjectId?: string | null; inspectionId?: string | null; title?: string }) {
  const company = await db.company.findFirst({ where: { id: input.companyId, tenantId: input.tenantId, status: 'ACTIVE' }, select: { id: true, legalName: true, tradeName: true } });
  if (!company) throw new Error('Empresa não encontrada');
  let project: { id: string; companyId: string; serviceType: string; title: string } | null = null;
  if (input.workProjectId) {
    project = await db.workProject.findFirst({ where: { id: input.workProjectId, tenantId: input.tenantId, companyId: company.id }, select: { id: true, companyId: true, serviceType: true, title: true } });
    if (!project) throw new Error('Trabalho SST não encontrado');
  }
  if (input.inspectionId) {
    const inspection = await db.inspection.findFirst({ where: { id: input.inspectionId, companyId: company.id }, select: { id: true } });
    if (!inspection) throw new Error('Vistoria não encontrada');
  }
  const visit = await db.fieldVisit.create({
    data: {
      tenantId: input.tenantId,
      companyId: company.id,
      workProjectId: project?.id ?? null,
      inspectionId: input.inspectionId || null,
      title: input.title?.trim().slice(0, 180) || `Visita técnica — ${company.tradeName ?? company.legalName}`,
      checklist: toPrismaJson(fieldChecklistFor(project?.serviceType)),
      startedById: input.userId,
      metadata: toPrismaJson({ serviceType: project?.serviceType ?? null }),
    },
  });
  await audit({ tenantId: input.tenantId, companyId: company.id, userId: input.userId, action: 'FIELD_VISIT_CREATED', entityType: 'FieldVisit', entityId: visit.id, after: { title: visit.title, workProjectId: visit.workProjectId } });
  return visit;
}

export async function setFieldVisitStatus(input: { tenantId: string; userId: string; visitId: string; status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'REVIEWED' | 'CANCELLED'; checklistCode?: string; checklistCompleted?: boolean; notes?: string }) {
  const visit = await db.fieldVisit.findFirst({ where: { id: input.visitId, tenantId: input.tenantId } });
  if (!visit) throw new Error('Visita não encontrada');
  const checklist = input.checklistCode ? updateChecklist(visit.checklist, input.checklistCode, input.checklistCompleted !== false) : visit.checklist;
  const progress = checklistProgress(checklist);
  const now = new Date();
  const updated = await db.fieldVisit.update({
    where: { id: visit.id },
    data: {
      status: input.status,
      checklist: toPrismaJson(checklist),
      progress,
      notes: input.notes?.trim().slice(0, 10000) || visit.notes,
      startedAt: input.status === 'IN_PROGRESS' ? (visit.startedAt ?? now) : visit.startedAt,
      completedAt: input.status === 'COMPLETED' ? now : visit.completedAt,
      reviewedAt: input.status === 'REVIEWED' ? now : visit.reviewedAt,
    },
  });
  await audit({ tenantId: input.tenantId, companyId: visit.companyId, userId: input.userId, action: 'FIELD_VISIT_UPDATED', entityType: 'FieldVisit', entityId: visit.id, before: { status: visit.status, progress: visit.progress }, after: { status: updated.status, progress: updated.progress } });
  return updated;
}

export async function analyzeFieldCapture(captureId: string) {
  const capture = await db.fieldCapture.findUnique({
    where: { id: captureId },
    include: { fieldVisit: true, file: true, workProject: { select: { title: true, serviceType: true } }, sector: true, ghe: true, jobFunction: true, workstation: true },
  });
  if (!capture) throw new Error('Evidência de campo não encontrada');
  if (!capture.file) throw new Error('Arquivo da evidência não encontrado');
  const configuration = await loadActiveAIConfiguration(capture.fieldVisit.tenantId);
  if (!configuration) throw new Error('Nenhum provedor de IA ativo');
  if (capture.kind === 'PHOTO' && !configuration.settings.capabilities.images) throw new Error('O provedor não está habilitado para imagens');
  if (capture.kind === 'DOCUMENT' && !configuration.settings.capabilities.pdf && capture.file.mimeType === 'application/pdf') throw new Error('O provedor não está habilitado para PDF');
  const model = capture.kind === 'PHOTO' || capture.kind === 'VIDEO' ? (configuration.settings.modelVision || configuration.settings.modelAdvanced) : configuration.settings.modelAdvanced;
  if (!model) throw new Error('Modelo multimodal não configurado');
  await db.fieldCapture.update({ where: { id: capture.id }, data: { status: 'ANALYZING', error: null } });
  try {
    const data = await storage.get(capture.file.storageKey);
    const client = createAIProviderClient({ provider: configuration.provider, model, apiKey: configuration.apiKey });
    const response = await client.complete({
      system: [
        'Você analisa evidências de campo em Segurança e Saúde no Trabalho.',
        'Descreva apenas indícios observáveis. Não invente peso, distância, ângulo, duração, ruído, concentração, temperatura, diagnóstico ou conclusão legal.',
        'Para áudio, transcreva o conteúdo. Para documento, extraia informações úteis com ressalvas. Para imagem, descreva cenário, atividade aparente e possíveis fatores a confirmar.',
        'Responda em JSON válido com: summary, transcript, observations, possibleFactors, missingMeasurements, suggestedQuestions, privacyWarnings, confidence.',
      ].join('\n'),
      prompt: `Contexto: trabalho ${capture.workProject?.title ?? 'não vinculado'}; serviço ${capture.workProject?.serviceType ?? 'não informado'}; setor ${capture.sector?.name ?? 'não informado'}; GHE ${capture.ghe?.name ?? 'não informado'}; função ${capture.jobFunction?.name ?? 'não informada'}; posto ${capture.workstation?.name ?? 'não informado'}. Legenda do profissional: ${capture.caption ?? 'sem legenda'}.`,
      files: [{ filename: capture.file.originalName, mimeType: capture.file.mimeType, data }],
      maxOutputTokens: 1800,
    });
    const analysis = extractJson(response.text);
    const confidence = Math.max(0, Math.min(100, Number(analysis.confidence) || 0));
    const transcript = typeof analysis.transcript === 'string' ? analysis.transcript.slice(0, 50000) : null;
    const updated = await db.fieldCapture.update({ where: { id: capture.id }, data: { status: 'REVIEW', aiAnalysis: toPrismaJson(analysis), transcript, confidence, analyzedAt: new Date(), error: null } });
    await db.aIUsageRecord.create({ data: { tenantId: capture.fieldVisit.tenantId, workProjectId: capture.workProjectId, provider: configuration.provider, model, purpose: 'FIELD_CAPTURE_ANALYSIS', inputTokens: response.inputTokens, outputTokens: response.outputTokens, metadata: toPrismaJson({ captureId: capture.id, visitId: capture.fieldVisitId, fileId: capture.fileObjectId }) } });
    if (capture.workProjectId) {
      const exists = await db.workflowArtifact.findFirst({ where: { workProjectId: capture.workProjectId, entityType: 'FieldCapture', entityId: capture.id } });
      if (!exists) await db.workflowArtifact.create({ data: { workProjectId: capture.workProjectId, workflowStepId: capture.workflowStepId, kind: 'FIELD_EVIDENCE', title: capture.title, entityType: 'FieldCapture', entityId: capture.id, fileId: capture.fileObjectId, metadata: toPrismaJson({ fieldVisitId: capture.fieldVisitId, captureKind: capture.kind, reviewStatus: 'PENDING' }) } });
    }
    await audit({ tenantId: capture.fieldVisit.tenantId, companyId: capture.fieldVisit.companyId, action: 'FIELD_CAPTURE_ANALYZED', entityType: 'FieldCapture', entityId: capture.id, after: { status: updated.status, confidence, provider: configuration.provider, model } });
    return { captureId: capture.id, status: updated.status, confidence };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.fieldCapture.update({ where: { id: capture.id }, data: { status: 'FAILED', error: message.slice(0, 2000) } });
    throw error;
  }
}
