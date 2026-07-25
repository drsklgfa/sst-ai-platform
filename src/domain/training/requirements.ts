export type WorkerTrainingContext = { jobFunctionId?: string | null; gheId?: string | null; riskCategories?: string[]; exposureAgentIds?: string[] };
export type TrainingRuleContext = { id: string; jobFunctionId?: string | null; gheId?: string | null; riskCategory?: string | null; exposureAgentId?: string | null; active: boolean; courseId?: string | null; pathId?: string | null };

export function ruleAppliesToWorker(rule: TrainingRuleContext, worker: WorkerTrainingContext): boolean {
  if (!rule.active || (!rule.courseId && !rule.pathId)) return false;
  if (rule.jobFunctionId && rule.jobFunctionId !== worker.jobFunctionId) return false;
  if (rule.gheId && rule.gheId !== worker.gheId) return false;
  if (rule.riskCategory && !(worker.riskCategories ?? []).map((v) => v.toUpperCase()).includes(rule.riskCategory.toUpperCase())) return false;
  if (rule.exposureAgentId && !(worker.exposureAgentIds ?? []).includes(rule.exposureAgentId)) return false;
  return true;
}

export function trainingDueDate(assignedAt: Date, dueInDays?: number | null): Date | null {
  if (!dueInDays) return null;
  if (!Number.isInteger(dueInDays) || dueInDays < 1) throw new Error('Prazo de treinamento inválido.');
  const date = new Date(assignedAt);
  date.setUTCDate(date.getUTCDate() + dueInDays);
  return date;
}

export function competencyState(validUntil: Date | null, referenceDate = new Date(), warningDays = 30): 'VALID' | 'EXPIRING' | 'EXPIRED' {
  if (!validUntil) return 'VALID';
  if (validUntil.getTime() < referenceDate.getTime()) return 'EXPIRED';
  const warning = new Date(referenceDate);
  warning.setUTCDate(warning.getUTCDate() + warningDays);
  return validUntil.getTime() <= warning.getTime() ? 'EXPIRING' : 'VALID';
}
