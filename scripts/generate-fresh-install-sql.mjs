import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('artifacts', { recursive: true });
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
if (result.status !== 0 || !result.stdout.trim()) {
  console.error(result.stderr || 'Não foi possível gerar o SQL de instalação limpa.');
  process.exit(result.status || 1);
}
writeFileSync('artifacts/fresh-install.sql', result.stdout);
console.log(`SQL de instalação limpa gerado: ${result.stdout.split('\n').length} linhas.`);
