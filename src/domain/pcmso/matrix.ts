export const occupationalExamTypes = ['ADMISSION', 'PERIODIC', 'RETURN_TO_WORK', 'RISK_CHANGE', 'POINT_MONITORING', 'TERMINATION'] as const;
export type OccupationalExamTypeValue = typeof occupationalExamTypes[number];

export type MatrixRequirementLike = {
  id: string;
  gheId?: string | null;
  jobFunctionId?: string | null;
  occupationalExamTypes: unknown;
  periodicityMonths?: number | null;
  active?: boolean;
};

export type WorkerAssignmentLike = {
  gheId?: string | null;
  jobFunctionId?: string | null;
};

export function normalizeOccupationalExamTypes(value: unknown): OccupationalExamTypeValue[] {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[;,\s]+/) : [];
  const normalized = items.map((item) => String(item).trim().toUpperCase()).filter((item): item is OccupationalExamTypeValue => occupationalExamTypes.includes(item as OccupationalExamTypeValue));
  return [...new Set(normalized)];
}

export function requirementAppliesToWorker(requirement: MatrixRequirementLike, worker: WorkerAssignmentLike): boolean {
  if (requirement.active === false) return false;
  if (requirement.jobFunctionId && requirement.jobFunctionId !== worker.jobFunctionId) return false;
  if (requirement.gheId && requirement.gheId !== worker.gheId) return false;
  return true;
}

export function requirementsForWorker(requirements: MatrixRequirementLike[], worker: WorkerAssignmentLike, examType: OccupationalExamTypeValue): MatrixRequirementLike[] {
  return requirements.filter((item) => requirementAppliesToWorker(item, worker) && normalizeOccupationalExamTypes(item.occupationalExamTypes).includes(examType));
}

export function addMonthsClamped(date: Date, months: number): Date {
  if (!Number.isInteger(months) || months <= 0 || months > 240) throw new Error('Periodicidade deve estar entre 1 e 240 meses');
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function periodicDueDate(input: { lastAsoAt?: Date | null; admissionDate?: Date | null; referenceDate: Date; periodicityMonths: number }): Date {
  const base = input.lastAsoAt ?? input.admissionDate ?? input.referenceDate;
  return addMonthsClamped(base, input.periodicityMonths);
}

export function shortestPeriodicity(requirements: MatrixRequirementLike[], fallbackMonths = 12): number {
  const values = requirements.map((item) => item.periodicityMonths).filter((value): value is number => Number.isInteger(value) && Number(value) > 0);
  return values.length ? Math.min(...values) : fallbackMonths;
}
