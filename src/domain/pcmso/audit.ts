export type PcmsoAuditInput = {
  hasScope: boolean;
  hasResponsiblePhysician: boolean;
  hasPgrReference: boolean;
  activeWorkerCount: number;
  examCatalogCount: number;
  examRequirementCount: number;
  workersWithoutMatrixCoverage: number;
  overdueCallCount: number;
  callsMissingProvider: number;
  issuedAsoCount: number;
  asosPendingFitness: number;
  asosWithoutExams: number;
  s2220ReadyCount: number;
  s2220InvalidCount: number;
  analyticalReportCount: number;
  workflowProgress: number;
};

export type PcmsoAuditFinding = { code: string; severity: 'ERROR' | 'WARNING' | 'INFO'; message: string };

export function auditPcmsoCompleteness(input: PcmsoAuditInput) {
  const findings: PcmsoAuditFinding[] = [];
  const error = (code: string, message: string) => findings.push({ code, severity: 'ERROR' as const, message });
  const warning = (code: string, message: string) => findings.push({ code, severity: 'WARNING' as const, message });
  const info = (code: string, message: string) => findings.push({ code, severity: 'INFO' as const, message });

  if (!input.hasScope) error('PCMSO_SCOPE_MISSING', 'Escopo e diretrizes do PCMSO não foram definidos.');
  if (!input.hasResponsiblePhysician) error('PCMSO_PHYSICIAN_MISSING', 'Médico responsável pelo PCMSO não foi definido.');
  if (!input.hasPgrReference) warning('PCMSO_PGR_REFERENCE', 'PGR ou inventário de riscos não está vinculado ao PCMSO.');
  if (!input.activeWorkerCount) warning('PCMSO_WORKERS_EMPTY', 'Nenhum trabalhador ativo foi cadastrado.');
  if (!input.examCatalogCount) error('PCMSO_EXAM_CATALOG_EMPTY', 'Catálogo de avaliações clínicas e exames está vazio.');
  if (!input.examRequirementCount) error('PCMSO_MATRIX_EMPTY', 'Matriz de exames ainda não possui regras.');
  if (input.workersWithoutMatrixCoverage) error('PCMSO_MATRIX_COVERAGE', `${input.workersWithoutMatrixCoverage} trabalhador(es) sem cobertura na matriz de exames.`);
  if (input.overdueCallCount) warning('PCMSO_OVERDUE_CALLS', `${input.overdueCallCount} convocação(ões) estão vencidas.`);
  if (input.callsMissingProvider) warning('PCMSO_CALL_PROVIDER', `${input.callsMissingProvider} convocação(ões) agendadas sem prestador definido.`);
  if (input.asosPendingFitness) error('PCMSO_ASO_FITNESS', `${input.asosPendingFitness} ASO(s) sem conclusão de aptidão.`);
  if (input.asosWithoutExams) error('PCMSO_ASO_EXAMS', `${input.asosWithoutExams} ASO(s) sem avaliações clínicas ou exames.`);
  if (input.s2220InvalidCount) warning('PCMSO_S2220_INVALID', `${input.s2220InvalidCount} rascunho(s) S-2220 possuem erros de validação.`);
  if (input.issuedAsoCount && !input.s2220ReadyCount) info('PCMSO_S2220_NOT_PREPARED', 'Existem ASOs emitidos sem rascunho S-2220 validado.');
  if (!input.analyticalReportCount) warning('PCMSO_ANALYTICAL_REPORT', 'Relatório analítico do período ainda não foi gerado.');
  if (input.workflowProgress < 100) info('PCMSO_WORKFLOW_INCOMPLETE', `Fluxo do trabalho está com ${input.workflowProgress}% de conclusão.`);

  const errors = findings.filter((item) => item.severity === 'ERROR').length;
  const warnings = findings.filter((item) => item.severity === 'WARNING').length;
  const score = Math.max(0, 100 - errors * 12 - warnings * 4 - (input.workflowProgress < 100 ? Math.ceil((100 - input.workflowProgress) / 10) : 0));
  return { status: errors ? 'FAILED' : warnings ? 'PASSED_WITH_WARNINGS' : 'PASSED', score, findings } as const;
}
