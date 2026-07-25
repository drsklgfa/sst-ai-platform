const allowed = new Map<string, { kind: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'; maxBytes: number }>([
  ['image/jpeg', { kind: 'PHOTO', maxBytes: 20 * 1024 * 1024 }],
  ['image/png', { kind: 'PHOTO', maxBytes: 20 * 1024 * 1024 }],
  ['image/webp', { kind: 'PHOTO', maxBytes: 20 * 1024 * 1024 }],
  ['video/mp4', { kind: 'VIDEO', maxBytes: 100 * 1024 * 1024 }],
  ['video/webm', { kind: 'VIDEO', maxBytes: 100 * 1024 * 1024 }],
  ['audio/mpeg', { kind: 'AUDIO', maxBytes: 50 * 1024 * 1024 }],
  ['audio/mp4', { kind: 'AUDIO', maxBytes: 50 * 1024 * 1024 }],
  ['audio/webm', { kind: 'AUDIO', maxBytes: 50 * 1024 * 1024 }],
  ['audio/wav', { kind: 'AUDIO', maxBytes: 50 * 1024 * 1024 }],
  ['application/pdf', { kind: 'DOCUMENT', maxBytes: 50 * 1024 * 1024 }],
  ['text/plain', { kind: 'DOCUMENT', maxBytes: 10 * 1024 * 1024 }],
  ['text/csv', { kind: 'DOCUMENT', maxBytes: 20 * 1024 * 1024 }],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', { kind: 'DOCUMENT', maxBytes: 50 * 1024 * 1024 }],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { kind: 'DOCUMENT', maxBytes: 50 * 1024 * 1024 }],
]);

export function validateFieldFile(file: File) {
  const rule = allowed.get(file.type);
  if (!rule) throw new Error(`Tipo de arquivo não permitido: ${file.type || 'desconhecido'}`);
  if (file.size <= 0) throw new Error('Arquivo vazio');
  if (file.size > rule.maxBytes) throw new Error(`Arquivo excede o limite de ${Math.round(rule.maxBytes / 1024 / 1024)} MB`);
  return rule;
}

export function attachmentKindForMime(mimeType: string): 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'SPREADSHEET' | 'TEXT' | 'OTHER' {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'SPREADSHEET';
  if (mimeType.startsWith('text/')) return 'TEXT';
  if (mimeType === 'application/pdf' || mimeType.includes('wordprocessing')) return 'DOCUMENT';
  return 'OTHER';
}

export function validateCopilotFiles(files: File[]) {
  if (files.length > 4) throw new Error('Envie no máximo quatro arquivos por mensagem');
  let total = 0;
  return files.map((file) => {
    const rule = validateFieldFile(file);
    total += file.size;
    return rule;
  }).map((rule) => {
    if (total > 60 * 1024 * 1024) throw new Error('O conjunto de anexos excede 60 MB');
    return rule;
  });
}
