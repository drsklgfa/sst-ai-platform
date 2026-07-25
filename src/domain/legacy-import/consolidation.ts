import { normalizeCnpj as normalizeCanonicalCnpj } from '../company/cnpj.ts';
export type ConsolidationFact = {
  id: string;
  entityType: string;
  entityKey: string | null;
  fieldPath: string;
  value: unknown;
  normalizedValue: unknown;
  confidence: number;
  status?: string;
};

export type DetectedConflict = {
  kind: 'VALUE_MISMATCH';
  fieldPath: string;
  summary: string;
  factIds: string[];
  values: unknown[];
};

export function normalizeCnpj(value: unknown) {
  return normalizeCanonicalCnpj(value);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function normalizedComparable(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(canonical(value));
}

export function detectFactConflicts(facts: ConsolidationFact[]): DetectedConflict[] {
  const groups = new Map<string, ConsolidationFact[]>();
  for (const fact of facts) {
    if (['REJECTED'].includes(fact.status ?? '')) continue;
    const key = [fact.entityType, fact.entityKey ?? '', fact.fieldPath].join('::');
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }
  const conflicts: DetectedConflict[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const values = new Map<string, unknown>();
    for (const fact of group) {
      const candidate = fact.normalizedValue ?? fact.value;
      values.set(normalizedComparable(candidate), candidate);
    }
    if (values.size <= 1) continue;
    conflicts.push({
      kind: 'VALUE_MISMATCH',
      fieldPath: key,
      summary: `Valores divergentes para ${group[0].entityType} ${group[0].entityKey ?? ''} · ${group[0].fieldPath}`.trim(),
      factIds: group.map((fact) => fact.id),
      values: [...values.values()],
    });
  }
  return conflicts;
}

export function factNeedsReview(confidence: number, domain: string) {
  return confidence < 85 || domain === 'MEDICAL_SENSITIVE';
}
