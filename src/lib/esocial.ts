import type { EsocialEnvironment, EsocialEventType } from '@prisma/client';
import { esocialIdempotencyKey, validateEsocialDraft } from '@/domain/integrations/esocial';
import { db } from './db';
import { toPrismaJson } from './prisma-json';
import { env } from './env';
import { esocialRetryDelayMs, isRetryableEsocialHttpStatus, validateSignedEsocialBatchXml } from '@/domain/integrations/esocial-transport';
import { transmitSignedEsocialBatch } from '@/lib/integrations/esocial-transmission';
import { sha256 } from '@/lib/crypto';

export async function queueEsocialDraft(input: {
  tenantId: string;
  companyId: string;
  workerId?: string | null;
  eventType: EsocialEventType;
  environment?: EsocialEnvironment;
  layoutVersion?: string;
  payload: Record<string, unknown>;
  relatedEntityType: string;
  relatedEntityId: string;
  userId?: string;
}) {
  const company = await db.company.findFirst({ where: { id: input.companyId, tenantId: input.tenantId, status: 'ACTIVE' } });
  if (!company) throw new Error('Empresa não encontrada');
  if (input.workerId) {
    const worker = await db.occupationalWorker.findFirst({ where: { id: input.workerId, tenantId: input.tenantId, companyId: input.companyId } });
    if (!worker) throw new Error('Trabalhador não pertence à empresa');
  }
  const environment = input.environment ?? 'RESTRICTED';
  const layoutVersion = input.layoutVersion ?? 'S-1.3';
  const draft = { eventType: input.eventType, companyId: input.companyId, workerId: input.workerId ?? null, relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, payload: input.payload };
  const validation = validateEsocialDraft(draft);
  const idempotencyKey = esocialIdempotencyKey(draft, environment, layoutVersion);
  return db.esocialEventQueue.upsert({
    where: { idempotencyKey },
    update: { payload: toPrismaJson(input.payload), validationErrors: toPrismaJson(validation.errors), status: validation.valid ? 'VALIDATED' : 'DRAFT', createdById: input.userId ?? null },
    create: { tenantId: input.tenantId, companyId: input.companyId, workerId: input.workerId ?? null, eventType: input.eventType, environment, layoutVersion, payload: toPrismaJson(input.payload), validationErrors: toPrismaJson(validation.errors), status: validation.valid ? 'VALIDATED' : 'DRAFT', relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, idempotencyKey, createdById: input.userId ?? null },
  });
}


export async function attachSignedEsocialBatch(input: { tenantId: string; eventId: string; signedBatchXml: string; userId: string }) {
  const event = await db.esocialEventQueue.findFirst({ where: { id: input.eventId, tenantId: input.tenantId } });
  if (!event) throw new Error('Evento do eSocial não encontrado');
  if (!['DRAFT', 'VALIDATED', 'REJECTED'].includes(event.status)) throw new Error('O lote assinado não pode ser substituído neste estado');
  const signed = validateSignedEsocialBatchXml(input.signedBatchXml);
  if (!signed.valid) throw new Error(`Lote assinado inválido: ${signed.errors.join('; ')}`);
  const previous = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
  const payload = {
    ...previous,
    signedBatchXml: signed.xml,
    signedBatchSha256: sha256(Buffer.from(signed.xml, 'utf8')),
    signedBatchAttachedAt: new Date().toISOString(),
    signedBatchAttachedById: input.userId,
  };
  return db.esocialEventQueue.update({
    where: { id: event.id },
    data: { payload: toPrismaJson(payload), status: 'VALIDATED', validationErrors: toPrismaJson([]), lastError: null },
  });
}

export async function enqueueValidatedEsocialEvent(input: { tenantId: string; eventId: string }) {
  if (env.ESOCIAL_TRANSPORT_MODE !== 'external_signed_xml') throw new Error('Transporte oficial do eSocial não está configurado');
  const event = await db.esocialEventQueue.findFirst({ where: { id: input.eventId, tenantId: input.tenantId } });
  if (!event) throw new Error('Evento do eSocial não encontrado');
  if (event.status !== 'VALIDATED') throw new Error('Somente eventos validados podem entrar na fila');
  const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload as Record<string, unknown> : {};
  const signed = validateSignedEsocialBatchXml(payload.signedBatchXml);
  if (!signed.valid) throw new Error(`XML assinado obrigatório antes da transmissão: ${signed.errors.join('; ')}`);
  return db.$transaction(async (tx) => {
    const updated = await tx.esocialEventQueue.update({ where: { id: event.id }, data: { status: 'QUEUED', nextAttemptAt: new Date(), lastError: null } });
    await tx.job.create({ data: { tenantId: input.tenantId, type: 'ESOCIAL_TRANSMIT', payload: toPrismaJson({ eventId: event.id }), maxAttempts: 5 } });
    return updated;
  });
}

export async function transmitQueuedEsocialEvent(input: { tenantId: string; eventId: string }) {
  const event = await db.esocialEventQueue.findFirst({ where: { id: input.eventId, tenantId: input.tenantId } });
  if (!event) throw new Error('Evento do eSocial não encontrado');
  if (event.status === 'ACCEPTED') return { accepted: true, duplicate: true, receiptNumber: event.receiptNumber };
  if (!['QUEUED', 'REJECTED'].includes(event.status)) throw new Error('Evento não está apto à transmissão');
  const claimed = await db.esocialEventQueue.updateMany({ where: { id: event.id, status: { in: ['QUEUED', 'REJECTED'] } }, data: { status: 'SENDING', attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
  if (claimed.count === 0) return { accepted: false, duplicate: true };
  const current = await db.esocialEventQueue.findUniqueOrThrow({ where: { id: event.id } });
  const payload = current.payload && typeof current.payload === 'object' && !Array.isArray(current.payload) ? current.payload as Record<string, unknown> : {};
  try {
    const response = await transmitSignedEsocialBatch({ environment: current.environment, signedBatchXml: String(payload.signedBatchXml ?? '') });
    const accepted = response.status >= 200 && response.status < 300 && response.parsed.accepted;
    await db.esocialEventQueue.update({ where: { id: current.id }, data: {
      status: accepted ? 'ACCEPTED' : 'REJECTED',
      receiptNumber: response.parsed.receiptNumber,
      responsePayload: toPrismaJson({ httpStatus: response.status, responseCode: response.parsed.responseCode, description: response.parsed.description, body: response.body.slice(0, 200_000) }),
      acceptedAt: accepted ? new Date() : null,
      lastError: accepted ? null : response.parsed.description ?? `Resposta HTTP ${response.status} sem protocolo aceito`,
      nextAttemptAt: !accepted && isRetryableEsocialHttpStatus(response.status) ? new Date(Date.now() + esocialRetryDelayMs(current.attempts)) : null,
    } });
    if (!accepted) throw new Error(response.parsed.description ?? `Lote do eSocial rejeitado (HTTP ${response.status})`);
    return { accepted: true, receiptNumber: response.parsed.receiptNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.esocialEventQueue.updateMany({ where: { id: current.id, status: 'SENDING' }, data: { status: 'REJECTED', lastError: message, nextAttemptAt: new Date(Date.now() + esocialRetryDelayMs(current.attempts)) } });
    throw error;
  }
}

export async function cancelEsocialEvent(input: { tenantId: string; eventId: string; reason: string }) {
  const event = await db.esocialEventQueue.findFirst({ where: { id: input.eventId, tenantId: input.tenantId } });
  if (!event) throw new Error('Evento do eSocial não encontrado');
  if (event.status === 'ACCEPTED') throw new Error('Evento aceito exige fluxo formal de retificação ou exclusão');
  if (input.reason.trim().length < 5) throw new Error('Motivo do cancelamento é obrigatório');
  return db.esocialEventQueue.update({ where: { id: event.id }, data: { status: 'CANCELLED', lastError: `Cancelado: ${input.reason.trim()}` } });
}

export async function esocialQueueOverview(input: { tenantId: string; companyId?: string }) {
  const rows = await db.esocialEventQueue.findMany({ where: { tenantId: input.tenantId, companyId: input.companyId }, orderBy: { createdAt: 'desc' } });
  return { total: rows.length, draft: rows.filter((item) => item.status === 'DRAFT').length, validated: rows.filter((item) => item.status === 'VALIDATED').length, queued: rows.filter((item) => item.status === 'QUEUED').length, accepted: rows.filter((item) => item.status === 'ACCEPTED').length, rejected: rows.filter((item) => item.status === 'REJECTED').length, rows };
}
