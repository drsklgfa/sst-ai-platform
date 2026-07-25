export type HygieneAuditInput = {
  hasScope: boolean;
  hasResponsibleProfessional: boolean;
  samplingPlanCount: number;
  plansWithoutStrategy: number;
  plansWithoutMethod: number;
  plansBelowMinimumSamples: number;
  measurementCount: number;
  measurementsWithoutInstrument: number;
  measurementsWithInvalidCalibration: number;
  measurementsWithoutRawData: number;
  measurementsWithoutCalculationMemory: number;
  measurementsWithoutLimits: number;
  unreviewedMeasurements: number;
  instrumentsBlockedOrExpired: number;
  limitationsRegistered: boolean;
  workflowProgress: number;
};

export function auditHygieneCompleteness(input: HygieneAuditInput) {
  const findings: Array<{ code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; message: string }> = [];
  const error = (code: string, message: string) => findings.push({ code, severity: 'ERROR' as const, message });
  const warning = (code: string, message: string) => findings.push({ code, severity: 'WARNING' as const, message });
  const info = (code: string, message: string) => findings.push({ code, severity: 'INFO' as const, message });
  if (!input.hasScope) error('HO_SCOPE', 'Escopo e objetivo da avaliação não foram definidos.');
  if (!input.hasResponsibleProfessional) error('HO_RESPONSIBLE', 'Responsável técnico não foi definido.');
  if (!input.samplingPlanCount) error('HO_SAMPLING_PLAN', 'Nenhum plano de amostragem foi cadastrado.');
  if (input.plansWithoutStrategy) error('HO_STRATEGY', `${input.plansWithoutStrategy} plano(s) sem estratégia de amostragem completa.`);
  if (input.plansWithoutMethod) error('HO_METHOD', `${input.plansWithoutMethod} plano(s) sem método e edição definidos.`);
  if (input.plansBelowMinimumSamples) warning('HO_SAMPLE_COUNT', `${input.plansBelowMinimumSamples} plano(s) ainda não atingiram a quantidade mínima de amostras.`);
  if (!input.measurementCount) error('HO_MEASUREMENTS', 'Nenhuma medição ou amostra foi registrada.');
  if (input.measurementsWithoutInstrument) warning('HO_INSTRUMENT', `${input.measurementsWithoutInstrument} medição(ões) sem instrumento vinculado.`);
  if (input.measurementsWithInvalidCalibration) error('HO_CALIBRATION', `${input.measurementsWithInvalidCalibration} medição(ões) utilizam calibração inválida, vencida ou ausente.`);
  if (input.measurementsWithoutRawData) warning('HO_RAW_DATA', `${input.measurementsWithoutRawData} medição(ões) sem dados brutos preservados.`);
  if (input.measurementsWithoutCalculationMemory) warning('HO_CALC_MEMORY', `${input.measurementsWithoutCalculationMemory} medição(ões) sem memória de cálculo.`);
  if (input.measurementsWithoutLimits) warning('HO_LIMITS', `${input.measurementsWithoutLimits} medição(ões) sem nível de ação ou limite aplicável.`);
  if (input.unreviewedMeasurements) error('HO_REVIEW', `${input.unreviewedMeasurements} medição(ões) aguardam revisão profissional.`);
  if (input.instrumentsBlockedOrExpired) warning('HO_INSTRUMENT_STATUS', `${input.instrumentsBlockedOrExpired} instrumento(s) bloqueado(s), vencido(s) ou em manutenção.`);
  if (!input.limitationsRegistered) warning('HO_LIMITATIONS', 'Limitações e ressalvas metodológicas não foram registradas.');
  if (input.workflowProgress < 100) info('HO_WORKFLOW', `Fluxo do trabalho está com ${input.workflowProgress}% de conclusão.`);
  const errors = findings.filter((item) => item.severity === 'ERROR').length;
  const warnings = findings.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errors * 12 - warnings * 4);
  return { status: errors ? 'FAILED' as const : warnings ? 'PASSED_WITH_WARNINGS' as const : 'PASSED' as const, score, errorCount: errors, warningCount: warnings, findings };
}
