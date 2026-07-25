export type PlanLimits = Record<string, number | boolean | null | undefined>;

export function subscriptionState(input: {
  status: string;
  trialEndsAt?: Date | null;
  currentPeriodEnd: Date;
  reference?: Date;
  invoiceOverdue?: boolean;
}) {
  const reference = input.reference ?? new Date();
  if (['CANCELLED', 'EXPIRED'].includes(input.status)) return input.status as 'CANCELLED' | 'EXPIRED';
  if (input.status === 'TRIAL' && input.trialEndsAt && input.trialEndsAt < reference) return 'EXPIRED' as const;
  if (input.invoiceOverdue) return 'PAST_DUE' as const;
  if (input.currentPeriodEnd < reference) return 'EXPIRED' as const;
  return input.status as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
}

export function planEntitlement(input: { limit: number | boolean | null | undefined; usage?: number }) {
  if (input.limit === true || input.limit == null) return { allowed: true, unlimited: true, remaining: null };
  if (input.limit === false) return { allowed: false, unlimited: false, remaining: 0 };
  const remaining = Math.max(0, input.limit - (input.usage ?? 0));
  return { allowed: remaining > 0, unlimited: false, remaining };
}

export function invoiceTransition(current: string, next: string) {
  const allowed: Record<string, string[]> = {
    DRAFT: ['OPEN', 'VOID'],
    OPEN: ['PAID', 'OVERDUE', 'VOID'],
    OVERDUE: ['PAID', 'VOID'],
    PAID: ['REFUNDED'],
    REFUNDED: [],
    VOID: [],
  };
  return allowed[current]?.includes(next) ?? false;
}

function lastUtcDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function billingPeriod(start: Date, interval: 'MONTHLY' | 'YEARLY' | 'ONE_TIME') {
  const end = new Date(start);
  if (interval === 'MONTHLY') {
    const originalDay = end.getUTCDate();
    const targetMonth = end.getUTCMonth() + 1;
    const targetYear = end.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    end.setUTCFullYear(targetYear, normalizedMonth, Math.min(originalDay, lastUtcDayOfMonth(targetYear, normalizedMonth)));
  } else if (interval === 'YEARLY') {
    const originalDay = end.getUTCDate();
    const targetYear = end.getUTCFullYear() + 1;
    const month = end.getUTCMonth();
    end.setUTCFullYear(targetYear, month, Math.min(originalDay, lastUtcDayOfMonth(targetYear, month)));
  } else {
    end.setUTCDate(end.getUTCDate() + 1);
  }
  return { start, end };
}
