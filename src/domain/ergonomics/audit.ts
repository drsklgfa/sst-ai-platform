export type ErgonomicsAuditFinding = { code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; message: string };
export type ErgonomicsAuditInput = {
  hasScope: boolean;
  hasResponsible: boolean;
  demandCount: number;
  workSituationCount: number;
  situationsWithoutPrescribedOrActual: number;
  participationCount: number;
  assessmentCount: number;
  calculatedAssessmentCount: number;
  unreviewedAssessmentCount: number;
  findingCount: number;
  highOrCriticalFindingCount: number;
  findingsWithoutRecommendation: number;
  findingsWithoutAction: number;
  hasAepDecision: boolean;
  aepRequiresAet: boolean;
  aetStageEnabled: boolean;
  limitationsRegistered: boolean;
  workflowProgress: number;
};

export function auditErgonomicsCompleteness(input: ErgonomicsAuditInput) {
  const findings: ErgonomicsAuditFinding[] = [];
  const error = (code: string, message: string) => findings.push({ code, severity: 'ERROR' as const, message });
  const warning = (code: string, message: string) => findings.push({ code, severity: 'WARNING' as const, message });
  if (!input.hasScope) error('ERG_SCOPE', 'Escopo e objetivo da avaliação não foram definidos.');
  if (!input.hasResponsible) error('ERG_RESPONSIBLE', 'Responsável técnico interno não foi definido.');
  if (!input.demandCount) error('ERG_DEMAND', 'A demanda e sua origem não foram registradas.');
  if (!input.workSituationCount) error('ERG_WORK_SITUATION', 'Nenhuma situação de trabalho foi caracterizada.');
  if (input.situationsWithoutPrescribedOrActual) error('ERG_ACTIVITY_GAP', `${input.situationsWithoutPrescribedOrActual} situação(ões) não comparam trabalho prescrito e real.`);
  if (!input.participationCount) warning('ERG_PARTICIPATION', 'A participação dos trabalhadores não foi registrada.');
  if (!input.assessmentCount) warning('ERG_METHODS', 'Nenhum método ou avaliação técnica foi registrado.');
  if (input.assessmentCount && !input.calculatedAssessmentCount) warning('ERG_CALCULATIONS', 'Não há cálculo determinístico registrado para os métodos que o exigem.');
  if (input.unreviewedAssessmentCount) warning('ERG_METHOD_REVIEW', `${input.unreviewedAssessmentCount} avaliação(ões) aguardam revisão profissional.`);
  if (!input.findingCount) warning('ERG_FINDINGS', 'Nenhum achado ergonômico foi consolidado.');
  if (input.findingsWithoutRecommendation) error('ERG_RECOMMENDATION', `${input.findingsWithoutRecommendation} achado(s) estão sem recomendação.`);
  if (input.highOrCriticalFindingCount && input.findingsWithoutAction) error('ERG_ACTION_PLAN', `${input.findingsWithoutAction} achado(s) alto(s) ou crítico(s) estão sem ação vinculada.`);
  if (!input.hasAepDecision) error('ERG_AEP_DECISION', 'A avaliação preliminar não possui decisão registrada.');
  if (input.aepRequiresAet && !input.aetStageEnabled) error('ERG_AET_REQUIRED', 'A AEP indicou aprofundamento, mas a etapa AET ainda não foi habilitada.');
  if (!input.limitationsRegistered) warning('ERG_LIMITATIONS', 'Limitações e ressalvas metodológicas não foram registradas.');
  if (input.workflowProgress < 80) warning('ERG_WORKFLOW', `Fluxo do trabalho está com ${input.workflowProgress}% de conclusão.`);
  const errorCount = findings.filter((item) => item.severity === 'ERROR').length;
  const warningCount = findings.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errorCount * 12 - warningCount * 4);
  return { status: errorCount ? 'FAILED' as const : warningCount ? 'PASSED_WITH_WARNINGS' as const : 'PASSED' as const, score, errorCount, warningCount, findings };
}
