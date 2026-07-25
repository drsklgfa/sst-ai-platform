export type ProgressStep = {
  required: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'NOT_APPLICABLE';
  completionPercent?: number;
};

export function normalizedStepProgress(step: ProgressStep): number {
  if (step.status === 'COMPLETED' || step.status === 'NOT_APPLICABLE') return 100;
  if (step.status === 'NOT_STARTED' || step.status === 'BLOCKED') return 0;
  return Math.max(0, Math.min(99, Math.round(step.completionPercent ?? 0)));
}

export function calculateWorkflowProgress(steps: ProgressStep[]): number {
  const required = steps.filter((step) => step.required);
  const source = required.length ? required : steps;
  if (!source.length) return 0;
  return Math.round(source.reduce((sum, step) => sum + normalizedStepProgress(step), 0) / source.length);
}
