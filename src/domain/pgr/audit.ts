export type PgrAuditFinding = {
  code: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  entityType?: string;
  entityId?: string;
};

export type PgrAuditInput = {
  hasScope: boolean;
  hasCriteria: boolean;
  hasResponsible: boolean;
  riskCount: number;
  risksWithoutSource: number;
  risksWithoutHarms: number;
  risksWithoutGroups: number;
  risksWithoutControls: number;
  risksNeedingAction: number;
  risksLinkedToAction: number;
  participationCount: number;
  psychosocialRequired: boolean;
  approvedPsychosocialCount: number;
  workflowProgress: number;
  overdueActionCount: number;
  actionsMissingOwnerOrDeadline: number;
};

export function auditPgrCompleteness(input: PgrAuditInput) {
  const findings: PgrAuditFinding[] = [];
  const error = (code: string, message: string) => findings.push({ code, severity: 'ERROR', message });
  const warning = (code: string, message: string) => findings.push({ code, severity: 'WARNING', message });
  const info = (code: string, message: string) => findings.push({ code, severity: 'INFO', message });

  if (!input.hasScope) error('PGR_SCOPE_MISSING', 'Escopo do PGR não foi definido.');
  if (!input.hasCriteria) error('PGR_CRITERIA_MISSING', 'Critérios de avaliação e tomada de decisão não foram registrados.');
  if (!input.hasResponsible) error('PGR_RESPONSIBLE_MISSING', 'Responsável pelo trabalho não foi definido.');
  if (input.riskCount === 0) error('PGR_INVENTORY_EMPTY', 'Inventário de riscos está vazio.');
  if (input.risksWithoutSource) error('PGR_RISK_SOURCE_MISSING', `${input.risksWithoutSource} risco(s) sem fonte ou circunstância.`);
  if (input.risksWithoutHarms) error('PGR_RISK_HARM_MISSING', `${input.risksWithoutHarms} risco(s) sem possíveis lesões ou agravos.`);
  if (input.risksWithoutGroups) error('PGR_EXPOSED_GROUP_MISSING', `${input.risksWithoutGroups} risco(s) sem grupo exposto.`);
  if (input.risksWithoutControls) warning('PGR_CONTROLS_MISSING', `${input.risksWithoutControls} risco(s) sem controles existentes registrados.`);
  if (input.risksLinkedToAction < input.risksNeedingAction) error('PGR_ACTION_COVERAGE', `${input.risksNeedingAction - input.risksLinkedToAction} risco(s) moderado(s), alto(s) ou crítico(s) sem ação vinculada.`);
  if (!input.participationCount) warning('PGR_WORKER_PARTICIPATION', 'Não há registro da participação dos trabalhadores.');
  if (input.psychosocialRequired && !input.approvedPsychosocialCount) error('PGR_PSYCHOSOCIAL_MISSING', 'Fatores psicossociais foram indicados, mas não existe avaliação psicossocial aprovada.');
  if (input.overdueActionCount) warning('PGR_OVERDUE_ACTIONS', `${input.overdueActionCount} ação(ões) estão vencidas.`);
  if (input.actionsMissingOwnerOrDeadline) warning('PGR_ACTION_RESPONSIBILITY', `${input.actionsMissingOwnerOrDeadline} ação(ões) sem responsável ou prazo definido.`);
  if (input.workflowProgress < 100) info('PGR_WORKFLOW_INCOMPLETE', `Fluxo do trabalho está com ${input.workflowProgress}% de conclusão.`);

  const errors = findings.filter((item) => item.severity === 'ERROR').length;
  const warnings = findings.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errors * 12 - warnings * 4 - (input.workflowProgress < 100 ? Math.ceil((100 - input.workflowProgress) / 10) : 0));
  const status = errors > 0 ? 'FAILED' : warnings > 0 ? 'PASSED_WITH_WARNINGS' : 'PASSED';
  return { status, score, findings } as const;
}
