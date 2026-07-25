import { randomBytes } from 'node:crypto';
import { encryptBackup, decryptBackup, isEncryptedBackup } from '../src/domain/backup/crypto.ts';

const payload = Buffer.concat([Buffer.from('SST-BACKUP-DRILL\n'), randomBytes(256 * 1024)]);
const password = `drill-${randomBytes(24).toString('hex')}`;
const encrypted = encryptBackup(payload, password);
if (!isEncryptedBackup(encrypted)) throw new Error('Contêiner de backup não reconhecido');
const restored = decryptBackup(encrypted, password);
if (!restored.equals(payload)) throw new Error('Restauração não reproduziu os bytes originais');
let wrongPasswordRejected = false;
try { decryptBackup(encrypted, `${password}-wrong`); } catch { wrongPasswordRejected = true; }
if (!wrongPasswordRejected) throw new Error('Senha incorreta não foi rejeitada');
console.log(JSON.stringify({ ok: true, sourceBytes: payload.length, encryptedBytes: encrypted.length, wrongPasswordRejected }, null, 2));
