export const LEGACY_DOCUMENT_KINDS = [
  'UNKNOWN',
  'PGR',
  'PCMSO',
  'LTCAT',
  'INSALUBRIDADE',
  'PERICULOSIDADE',
  'AET',
  'AEP',
  'HIGIENE_OCUPACIONAL',
  'INVENTARIO_RISCOS',
  'PLANO_ACAO',
  'ASO',
  'PPP',
  'ORDEM_SERVICO',
  'TREINAMENTO',
  'OUTRO',
] as const;

export type LegacyDocumentKindValue = typeof LEGACY_DOCUMENT_KINDS[number];

export const LEGACY_TARGET_SERVICES = ['PGR', 'PCMSO', 'LTCAT', 'INSALUBRIDADE', 'PERICULOSIDADE', 'AET', 'HIGIENE_OCUPACIONAL', 'TREINAMENTOS'] as const;

export const LEGACY_ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const LEGACY_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const LEGACY_MAX_FILES_PER_BATCH = 20;

export function isAcceptedLegacyFile(file: { type: string; size: number; name: string }) {
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  const extensionAllowed = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'csv', 'json', 'xml', 'jpg', 'jpeg', 'png', 'webp'].includes(extension);
  return file.size > 0 && file.size <= LEGACY_MAX_FILE_BYTES && (LEGACY_ACCEPTED_MIME_TYPES.has(file.type) || extensionAllowed);
}

export function legacyKindLabel(kind: string) {
  const labels: Record<string, string> = {
    UNKNOWN: 'Não identificado', PGR: 'PGR', PCMSO: 'PCMSO', LTCAT: 'LTCAT', INSALUBRIDADE: 'Laudo de insalubridade',
    PERICULOSIDADE: 'Laudo de periculosidade', AET: 'AET', AEP: 'AEP', HIGIENE_OCUPACIONAL: 'Avaliação ambiental',
    INVENTARIO_RISCOS: 'Inventário de riscos', PLANO_ACAO: 'Plano de ação', ASO: 'ASO', PPP: 'PPP',
    ORDEM_SERVICO: 'Ordem de serviço', TREINAMENTO: 'Treinamento', OUTRO: 'Outro documento',
  };
  return labels[kind] ?? kind;
}

export function inferLegacyMimeType(name: string, declared?: string) {
  if (declared && declared !== 'application/octet-stream') return declared;
  const extension = name.toLowerCase().split('.').pop() ?? '';
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    txt: 'text/plain', csv: 'text/csv', json: 'application/json', xml: 'application/xml',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  };
  return types[extension] ?? 'application/octet-stream';
}
