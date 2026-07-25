import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from './env';

const VERSION = 'v1';

function encryptionKey(): Buffer {
  return Buffer.from(env.FILE_ENCRYPTION_KEY, 'hex');
}

export function encryptSecret(value: string): string {
  if (!value) throw new Error('O segredo não pode ser vazio');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload: string): string {
  const [version, ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
  if (version !== VERSION || !ivEncoded || !tagEncoded || !dataEncoded) throw new Error('Formato de segredo criptografado inválido');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataEncoded, 'base64url')), decipher.final()]).toString('utf8');
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return 'não configurada';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

export function sensitiveHash(value: string): string {
  if (!value) throw new Error('O identificador não pode ser vazio');
  return createHmac('sha256', encryptionKey()).update(value, 'utf8').digest('hex');
}
