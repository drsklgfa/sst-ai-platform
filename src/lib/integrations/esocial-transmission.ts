import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { EsocialEnvironment } from '@prisma/client';
import { env } from '@/lib/env';
import { parseEsocialTransportResponse, validateSignedEsocialBatchXml } from '@/domain/integrations/esocial-transport';

function endpointFor(environment: EsocialEnvironment) {
  const endpoint = environment === 'PRODUCTION' ? env.ESOCIAL_PRODUCTION_ENDPOINT : env.ESOCIAL_RESTRICTED_ENDPOINT;
  if (!endpoint) throw new Error(`Endpoint do eSocial não configurado para ${environment}`);
  return new URL(endpoint);
}

export function esocialTransportReadiness() {
  const missing: string[] = [];
  if (env.ESOCIAL_TRANSPORT_MODE !== 'external_signed_xml') missing.push('ESOCIAL_TRANSPORT_MODE=external_signed_xml');
  if (!env.ESOCIAL_PFX_BASE64) missing.push('ESOCIAL_PFX_BASE64');
  if (!env.ESOCIAL_RESTRICTED_ENDPOINT) missing.push('ESOCIAL_RESTRICTED_ENDPOINT');
  if (!env.ESOCIAL_PRODUCTION_ENDPOINT) missing.push('ESOCIAL_PRODUCTION_ENDPOINT');
  return { ready: missing.length === 0, missing };
}

export async function transmitSignedEsocialBatch(input: { environment: EsocialEnvironment; signedBatchXml: string }) {
  const readiness = esocialTransportReadiness();
  if (!readiness.ready) throw new Error(`Transporte do eSocial indisponível: ${readiness.missing.join(', ')}`);
  const validation = validateSignedEsocialBatchXml(input.signedBatchXml);
  if (!validation.valid) throw new Error(`Lote do eSocial inválido: ${validation.errors.join('; ')}`);
  const endpoint = endpointFor(input.environment);
  const pfx = Buffer.from(env.ESOCIAL_PFX_BASE64 ?? '', 'base64');
  if (pfx.length < 100) throw new Error('Certificado PFX inválido ou vazio');

  const response = await new Promise<{ status: number; body: string; headers: IncomingHttpHeaders }>((resolve, reject) => {
    const request = https.request({
      protocol: endpoint.protocol,
      hostname: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : 443,
      path: `${endpoint.pathname}${endpoint.search}`,
      method: 'POST',
      pfx,
      passphrase: env.ESOCIAL_PFX_PASSPHRASE,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      headers: {
        'content-type': 'application/soap+xml; charset=utf-8',
        accept: 'application/soap+xml, application/xml, text/xml',
        'content-length': Buffer.byteLength(validation.xml),
        'user-agent': 'sst-saas-platform/10.11',
      },
      timeout: env.ESOCIAL_HTTP_TIMEOUT_MS,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers }));
    });
    request.on('timeout', () => request.destroy(new Error('Tempo limite na transmissão ao eSocial')));
    request.on('error', reject);
    request.end(validation.xml);
  });

  const parsed = parseEsocialTransportResponse(response.body);
  return { ...response, parsed };
}
