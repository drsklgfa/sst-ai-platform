import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { heartbeatIsFresh, latestServiceHeartbeat } from '@/lib/heartbeat';
import { evaluateReleaseReadiness } from '@/domain/release/readiness';

const ageDays = (date: Date | null | undefined) => date ? Math.floor((Date.now() - date.getTime()) / 86_400_000) : null;

export async function getReleaseReadiness(tenantId: string) {
  const [worker, failedJobs, latestBackup, latestRecovery, criticalIncidents] = await Promise.all([
    latestServiceHeartbeat('worker'),
    db.job.count({ where: { tenantId, status: 'FAILED', createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    db.backupExport.findFirst({ where: { tenantId, status: 'SUCCEEDED' }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
    db.recoveryTest.findFirst({ where: { tenantId, status: 'PASSED' }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } }),
    db.securityIncident.count({ where: { tenantId, severity: 'CRITICAL', status: { in: ['OPEN', 'INVESTIGATING', 'CONTAINED'] } } }),
  ]);
  const workerStatus = worker ? (heartbeatIsFresh(worker.lastSeenAt) ? 'OK' : 'STALE') : 'UNKNOWN';
  const paymentConfigured = env.PAYMENT_PROVIDER === 'asaas'
    ? Boolean(env.ASAAS_API_KEY && env.ASAAS_WEBHOOK_TOKEN)
    : env.PAYMENT_PROVIDER === 'mercado_pago'
      ? Boolean(env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET)
      : env.PAYMENT_PROVIDER === 'manual';
  const esocialConfigured = Boolean(env.ESOCIAL_PFX_BASE64 && env.ESOCIAL_RESTRICTED_ENDPOINT && env.ESOCIAL_PRODUCTION_ENDPOINT);
  return evaluateReleaseReadiness({
    deployEnvironment: env.DEPLOY_ENVIRONMENT,
    appUrl: env.APP_URL,
    dbSchemaMode: env.DB_SCHEMA_MODE,
    storageDriver: env.STORAGE_DRIVER,
    workerStatus,
    failedJobs,
    backupAgeDays: ageDays(latestBackup?.completedAt),
    recoveryTestAgeDays: ageDays(latestRecovery?.completedAt),
    openCriticalIncidents: criticalIncidents,
    emailProvider: env.EMAIL_PROVIDER,
    billingEnabled: env.FEATURE_BILLING,
    paymentProvider: env.PAYMENT_PROVIDER,
    paymentConfigured,
    esocialEnabled: env.FEATURE_ESOCIAL_TRANSMISSION,
    esocialTransportMode: env.ESOCIAL_TRANSPORT_MODE,
    esocialConfigured,
    releaseVersion: env.RELEASE_VERSION,
  });
}
