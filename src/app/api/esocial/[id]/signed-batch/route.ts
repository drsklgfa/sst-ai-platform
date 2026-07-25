import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { attachSignedEsocialBatch } from '@/lib/esocial';
import { sha256 } from '@/lib/crypto';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_ESOCIAL_TRANSMISSION) return new Response('Transmissão do eSocial desativada', { status: 404 });
  const auth = await authorizeTenantApi('esocial.transmit');
  if (auth instanceof Response) return auth;
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 20_000_000) return new Response('Lote excede 20 MB', { status: 413 });
  const signedBatchXml = await request.text();
  const { id } = await params;
  try {
    const event = await attachSignedEsocialBatch({ tenantId: auth.tenant.id, eventId: id, signedBatchXml, userId: auth.user.id });
    await audit({
      tenantId: auth.tenant.id,
      userId: auth.user.id,
      action: 'ESOCIAL_SIGNED_BATCH_ATTACHED',
      entityType: 'EsocialEventQueue',
      entityId: event.id,
      after: { sha256: sha256(Buffer.from(signedBatchXml, 'utf8')), bytes: Buffer.byteLength(signedBatchXml), status: event.status },
    });
    return Response.json({ id: event.id, status: event.status });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao anexar lote assinado', { status: 400 });
  }
}
