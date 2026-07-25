export type DateRange = { startsAt: Date; endsAt?: Date | null };

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export function validateExposurePeriod(range: DateRange, referenceDate = new Date()): string[] {
  const findings: string[] = [];
  const startsAt = startOfDay(range.startsAt);
  const endsAt = range.endsAt ? startOfDay(range.endsAt) : null;
  const reference = startOfDay(referenceDate);
  if (Number.isNaN(startsAt.getTime())) findings.push('Data inicial inválida.');
  if (endsAt && Number.isNaN(endsAt.getTime())) findings.push('Data final inválida.');
  if (endsAt && endsAt < startsAt) findings.push('A data final não pode ser anterior à data inicial.');
  if (startsAt > reference) findings.push('A data inicial da exposição não pode estar no futuro.');
  return findings;
}

export function exposurePeriodsOverlap(left: DateRange, right: DateRange): boolean {
  const leftStart = startOfDay(left.startsAt).getTime();
  const rightStart = startOfDay(right.startsAt).getTime();
  const leftEnd = left.endsAt ? startOfDay(left.endsAt).getTime() : Number.POSITIVE_INFINITY;
  const rightEnd = right.endsAt ? startOfDay(right.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function dateRangeDays(range: DateRange, referenceDate = new Date()): number {
  const start = startOfDay(range.startsAt).getTime();
  const end = startOfDay(range.endsAt ?? referenceDate).getTime();
  if (end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function normalizeExposurePattern(value: unknown): 'PERMANENT' | 'INTERMITTENT' | 'OCCASIONAL' | 'EVENTUAL' | 'UNKNOWN' {
  const normalized = String(value ?? '').trim().toUpperCase();
  return ['PERMANENT', 'INTERMITTENT', 'OCCASIONAL', 'EVENTUAL'].includes(normalized)
    ? normalized as 'PERMANENT' | 'INTERMITTENT' | 'OCCASIONAL' | 'EVENTUAL'
    : 'UNKNOWN';
}
