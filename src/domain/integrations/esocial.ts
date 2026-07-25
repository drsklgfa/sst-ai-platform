import { createHash } from 'node:crypto';

export type EsocialDraft = {
  eventType: 'S2210' | 'S2220' | 'S2240';
  companyId: string;
  workerId?: string | null;
  relatedEntityType: string;
  relatedEntityId: string;
  payload: Record<string, unknown>;
};

export function esocialIdempotencyKey(input: EsocialDraft, environment: 'RESTRICTED' | 'PRODUCTION', layoutVersion = 'S-1.3') {
  return createHash('sha256').update(JSON.stringify({ environment, layoutVersion, eventType: input.eventType, companyId: input.companyId, workerId: input.workerId ?? null, relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, payload: input.payload })).digest('hex');
}

export function validateEsocialDraft(input: EsocialDraft) {
  const errors: string[] = [];
  if (!input.companyId) errors.push('empresa ausente');
  if (!input.relatedEntityType || !input.relatedEntityId) errors.push('origem do evento ausente');
  if (!input.payload || Object.keys(input.payload).length === 0) errors.push('payload vazio');
  if (['S2210', 'S2220', 'S2240'].includes(input.eventType) && !input.workerId) errors.push('trabalhador ausente');
  return { valid: errors.length === 0, errors };
}

export function esocialStatusTransition(current: string, next: string) {
  const allowed: Record<string, string[]> = {
    DRAFT: ['VALIDATED', 'CANCELLED'],
    VALIDATED: ['QUEUED', 'CANCELLED'],
    QUEUED: ['SENDING', 'CANCELLED'],
    SENDING: ['ACCEPTED', 'REJECTED', 'QUEUED'],
    REJECTED: ['VALIDATED', 'CANCELLED'],
    ACCEPTED: [],
    CANCELLED: [],
  };
  return allowed[current]?.includes(next) ?? false;
}
