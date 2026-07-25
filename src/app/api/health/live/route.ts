import { env } from '@/lib/env';

export async function GET() {
  return Response.json({ ok: true, service: 'web', version: env.RELEASE_VERSION, time: new Date().toISOString() }, {
    headers: { 'cache-control': 'no-store' },
  });
}
