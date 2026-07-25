import { db } from '@/lib/db';
import { heartbeatIsFresh, latestServiceHeartbeat } from '@/lib/heartbeat';
import { env } from '@/lib/env';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const worker = await latestServiceHeartbeat('worker');
    return Response.json({
      ok: true,
      database: 'ok',
      worker: worker ? (heartbeatIsFresh(worker.lastSeenAt) ? 'ok' : 'stale') : 'unknown',
      version: env.RELEASE_VERSION,
      deployEnvironment: env.DEPLOY_ENVIRONMENT,
      time: new Date().toISOString(),
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, database: 'error', version: env.RELEASE_VERSION, time: new Date().toISOString() }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
