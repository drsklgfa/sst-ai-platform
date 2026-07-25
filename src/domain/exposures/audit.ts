export type ExposureAuditInput = {
  hasScope: boolean;
  hasResponsibleProfessional: boolean;
  periodCount: number;
  openPeriodCount: number;
  periodsWithoutStructure: number;
  agentCount: number;
  agentsWithoutLegalBasis: number;
  quantitativeAgentsWithoutMeasurement: number;
  measurementsWithoutCalibration: number;
  controlsWithoutEffectiveness: number;
  pendingTechnicalConclusions: number;
  pppInvalidCount: number;
  s2240InvalidCount: number;
  workflowProgress: number;
};

export function auditExposureCompleteness(input: ExposureAuditInput) {
  const findings: Array<{ code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; message: string }> = [];
  const error = (code: string, message: string) => findings.push({ code, severity: 'ERROR' as const, message });
  const warning = (code: string, message: string) => findings.push({ code, severity: 'WARNING' as const, message });
  const info = (code: string, message: string) => findings.push({ code, severity: 'INFO' as const, message });
  if (!input.hasScope) error('EXPOSURE_SCOPE', 'Escopo e finalidade do trabalho não foram definidos.');
  if (!input.hasResponsibleProfessional) error('EXPOSURE_RESPONSIBLE', 'Responsável técnico não foi definido.');
  if (!input.periodCount) error('EXPOSURE_PERIODS_EMPTY', 'Nenhum período ocupacional foi cadastrado.');
  if (input.periodsWithoutStructure) error('EXPOSURE_PERIOD_STRUCTURE', `${input.periodsWithoutStructure} período(s) sem estrutura ocupacional completa.`);
  if (!input.agentCount) error('EXPOSURE_AGENTS_EMPTY', 'Nenhum agente ou condição de exposição foi cadastrado.');
  if (input.agentsWithoutLegalBasis) warning('EXPOSURE_LEGAL_BASIS', `${input.agentsWithoutLegalBasis} agente(s) sem critério ou base técnica registrada.`);
  if (input.quantitativeAgentsWithoutMeasurement) error('EXPOSURE_MEASUREMENT_MISSING', `${input.quantitativeAgentsWithoutMeasurement} agente(s) quantitativo(s) sem medição.`);
  if (input.measurementsWithoutCalibration) warning('EXPOSURE_CALIBRATION', `${input.measurementsWithoutCalibration} medição(ões) sem calibração válida registrada.`);
  if (input.controlsWithoutEffectiveness) warning('EXPOSURE_CONTROLS', `${input.controlsWithoutEffectiveness} controle(s) sem avaliação de eficácia.`);
  if (input.pendingTechnicalConclusions) error('EXPOSURE_CONCLUSIONS', `${input.pendingTechnicalConclusions} conclusão(ões) técnica(s) aguardam aprovação.`);
  if (input.pppInvalidCount) warning('EXPOSURE_PPP_INVALID', `${input.pppInvalidCount} rascunho(s) de PPP possuem pendências.`);
  if (input.s2240InvalidCount) warning('EXPOSURE_S2240_INVALID', `${input.s2240InvalidCount} rascunho(s) S-2240 possuem erros ou alertas.`);
  if (input.openPeriodCount) info('EXPOSURE_OPEN_PERIODS', `${input.openPeriodCount} período(s) seguem sem data final, representando condição atual.`);
  if (input.workflowProgress < 100) info('EXPOSURE_WORKFLOW', `Fluxo do trabalho está com ${input.workflowProgress}% de conclusão.`);
  const errors = findings.filter((item) => item.severity === 'ERROR').length;
  const warnings = findings.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errors * 12 - warnings * 4 - (input.workflowProgress < 100 ? Math.ceil((100 - input.workflowProgress) / 10) : 0));
  return { status: errors ? 'FAILED' : warnings ? 'PASSED_WITH_WARNINGS' : 'PASSED', score, findings } as const;
}
