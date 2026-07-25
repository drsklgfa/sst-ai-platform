export function validateSignedEsocialBatchXml(value: unknown) {
  const xml = String(value ?? '').trim();
  const errors: string[] = [];
  if (!xml) errors.push('XML assinado ausente');
  if (xml.length > 20_000_000) errors.push('XML excede o limite de 20 MB');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) errors.push('DOCTYPE e ENTITY não são permitidos');
  if (xml && !/<(?:\w+:)?eSocial\b/i.test(xml)) errors.push('Elemento eSocial ausente');
  if (xml && !/<(?:\w+:)?Signature\b/i.test(xml)) errors.push('Assinatura XMLDSig ausente');
  if (xml && !/(envioLoteEventos|loteEventos)/i.test(xml)) errors.push('Estrutura de lote do eSocial ausente');
  return { valid: errors.length === 0, errors, xml };
}

export function parseEsocialTransportResponse(xml: string) {
  const pick = (...names: string[]) => {
    for (const name of names) {
      const match = xml.match(new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, 'i'));
      if (match) return match[1].replace(/<[^>]+>/g, '').trim();
    }
    return null;
  };
  const responseCode = pick('cdResposta', 'codigo');
  const description = pick('descResposta', 'descricao');
  const receiptNumber = pick('protocoloEnvio', 'nrRecibo', 'protocolo');
  return { responseCode, description, receiptNumber, accepted: Boolean(receiptNumber) && (!responseCode || ['201', '202', '0'].includes(responseCode)) };
}

export function esocialRetryDelayMs(attempt: number) {
  const base = Math.max(1, Math.min(8, Math.round(attempt))) * 15_000;
  return Math.min(10 * 60_000, base * base / 15_000);
}

export function isRetryableEsocialHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
