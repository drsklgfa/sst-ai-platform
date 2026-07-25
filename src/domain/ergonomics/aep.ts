export type AepDecisionInput = {
  findingCount: number;
  highOrCriticalFindings: number;
  unresolvedWorkerComplaints: number;
  insufficientInformation: boolean;
  recurringHealthSignals: boolean;
  processChange: boolean;
  legalOrTechnicalNeed: boolean;
};

export function recommendAepConclusion(input: AepDecisionInput) {
  const reasons: string[] = [];
  if (input.highOrCriticalFindings > 0) reasons.push('Existem achados ergonômicos altos ou críticos.');
  if (input.unresolvedWorkerComplaints > 0) reasons.push('Existem relatos de trabalhadores ainda não esclarecidos.');
  if (input.insufficientInformation) reasons.push('A avaliação preliminar não possui dados suficientes para concluir.');
  if (input.recurringHealthSignals) reasons.push('Existem sinais recorrentes de agravos ou queixas relacionados ao trabalho.');
  if (input.processChange) reasons.push('Mudança relevante de processo, organização ou condição de trabalho requer aprofundamento.');
  if (input.legalOrTechnicalNeed) reasons.push('Existe necessidade legal ou técnica de aprofundamento.');
  const requiresAet = input.highOrCriticalFindings > 0 || input.insufficientInformation || input.recurringHealthSignals || input.processChange || input.legalOrTechnicalNeed;
  if (requiresAet) return { conclusion: 'AET_REQUIRED' as const, requiresAet: true, reasons };
  if (input.findingCount > 0 || input.unresolvedWorkerComplaints > 0) return { conclusion: 'IMPROVEMENT_ACTIONS' as const, requiresAet: false, reasons: reasons.length ? reasons : ['Há oportunidades de melhoria que devem ser acompanhadas.'] };
  return { conclusion: 'NO_FURTHER_ACTION' as const, requiresAet: false, reasons: ['Não foram identificados elementos que exijam aprofundamento no escopo avaliado.'] };
}
