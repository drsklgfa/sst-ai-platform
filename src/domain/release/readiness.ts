export type ReleaseCheckStatus = 'PASS' | 'WARNING' | 'BLOCKED';
export type ReleaseCheck = { code: string; title: string; status: ReleaseCheckStatus; detail: string; category: 'DEPLOY' | 'SECURITY' | 'OPERATIONS' | 'INTEGRATIONS' | 'COMMERCIAL' };

export type ReleaseReadinessInput = {
  deployEnvironment: string;
  appUrl: string;
  dbSchemaMode: string;
  storageDriver: string;
  workerStatus: string;
  failedJobs: number;
  backupAgeDays: number | null;
  recoveryTestAgeDays: number | null;
  openCriticalIncidents: number;
  emailProvider: string;
  billingEnabled: boolean;
  paymentProvider: string;
  paymentConfigured: boolean;
  esocialEnabled: boolean;
  esocialTransportMode: string;
  esocialConfigured: boolean;
  releaseVersion: string;
};

export function evaluateReleaseReadiness(input: ReleaseReadinessInput) {
  const checks: ReleaseCheck[] = [];
  const add = (check: ReleaseCheck) => checks.push(check);
  add({ code: 'RELEASE_VERSION', title: 'Versão identificada', category: 'DEPLOY', status: input.releaseVersion && input.releaseVersion !== 'development' ? 'PASS' : 'WARNING', detail: input.releaseVersion || 'Versão não informada' });
  add({ code: 'HTTPS', title: 'HTTPS e URL pública', category: 'SECURITY', status: input.deployEnvironment !== 'production' || input.appUrl.startsWith('https://') ? 'PASS' : 'BLOCKED', detail: input.appUrl });
  add({ code: 'DB_MIGRATIONS', title: 'Banco em modo de migrations', category: 'DEPLOY', status: input.deployEnvironment !== 'production' || input.dbSchemaMode === 'migrate' ? 'PASS' : 'BLOCKED', detail: `DB_SCHEMA_MODE=${input.dbSchemaMode}` });
  add({ code: 'PRIVATE_STORAGE', title: 'Armazenamento persistente', category: 'SECURITY', status: input.deployEnvironment !== 'production' || input.storageDriver === 's3' ? 'PASS' : 'BLOCKED', detail: `STORAGE_DRIVER=${input.storageDriver}` });
  add({ code: 'WORKER', title: 'Worker operacional', category: 'OPERATIONS', status: input.workerStatus === 'OK' ? 'PASS' : input.workerStatus === 'STALE' ? 'BLOCKED' : 'WARNING', detail: input.workerStatus });
  add({ code: 'FAILED_JOBS', title: 'Fila sem falhas acumuladas', category: 'OPERATIONS', status: input.failedJobs === 0 ? 'PASS' : input.failedJobs <= 3 ? 'WARNING' : 'BLOCKED', detail: `${input.failedJobs} job(s) com falha` });
  add({ code: 'BACKUP', title: 'Backup recente', category: 'OPERATIONS', status: input.backupAgeDays == null ? 'BLOCKED' : input.backupAgeDays <= 7 ? 'PASS' : input.backupAgeDays <= 30 ? 'WARNING' : 'BLOCKED', detail: input.backupAgeDays == null ? 'Nenhum backup concluído' : `${input.backupAgeDays} dia(s)` });
  add({ code: 'RESTORE_DRILL', title: 'Teste de restauração recente', category: 'OPERATIONS', status: input.recoveryTestAgeDays == null ? 'BLOCKED' : input.recoveryTestAgeDays <= 30 ? 'PASS' : input.recoveryTestAgeDays <= 90 ? 'WARNING' : 'BLOCKED', detail: input.recoveryTestAgeDays == null ? 'Nenhum teste aprovado' : `${input.recoveryTestAgeDays} dia(s)` });
  add({ code: 'SECURITY_INCIDENTS', title: 'Incidentes críticos', category: 'SECURITY', status: input.openCriticalIncidents === 0 ? 'PASS' : 'BLOCKED', detail: `${input.openCriticalIncidents} incidente(s) crítico(s) aberto(s)` });
  add({ code: 'EMAIL', title: 'Comunicações por e-mail', category: 'INTEGRATIONS', status: input.emailProvider === 'disabled' ? 'WARNING' : 'PASS', detail: input.emailProvider });
  if (input.billingEnabled) add({ code: 'BILLING', title: 'Gateway de cobrança', category: 'COMMERCIAL', status: input.paymentProvider === 'manual' ? 'WARNING' : input.paymentConfigured ? 'PASS' : 'BLOCKED', detail: input.paymentProvider });
  if (input.esocialEnabled) add({ code: 'ESOCIAL', title: 'Transporte do eSocial', category: 'INTEGRATIONS', status: input.esocialTransportMode === 'external_signed_xml' && input.esocialConfigured ? 'PASS' : 'BLOCKED', detail: input.esocialTransportMode });
  const blocked = checks.filter((check) => check.status === 'BLOCKED').length;
  const warnings = checks.filter((check) => check.status === 'WARNING').length;
  const score = Math.max(0, Math.round((checks.filter((check) => check.status === 'PASS').length / Math.max(1, checks.length)) * 100));
  return { status: blocked ? 'BLOCKED' as const : warnings ? 'READY_WITH_WARNINGS' as const : 'READY' as const, score, blocked, warnings, checks };
}
