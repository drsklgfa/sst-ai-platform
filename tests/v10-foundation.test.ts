import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const shell = readFileSync('src/components/app-shell.tsx', 'utf8');
const aiRoute = readFileSync('src/app/api/settings/ai/route.ts', 'utf8');
const workRoute = readFileSync('src/app/api/work-projects/route.ts', 'utf8');

test('schema da versão 10 preserva trabalho, aprovação, desfazer e rastreio da IA', () => {
  for (const model of ['WorkflowTemplate', 'WorkProject', 'WorkflowStep', 'WorkflowRequirement', 'WorkflowArtifact', 'WorkflowDecision', 'ApprovalRequest', 'ChangeSet', 'AIThread', 'AIMessage', 'AIToolExecution', 'AIUsageRecord']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /OPENAI/);
  assert.match(schema, /SUPERVISED_AUTONOMY/);
});

test('novos módulos são ativados por feature flag e exigem autorização', () => {
  assert.match(shell, /FEATURE_V10_WORKS/);
  assert.match(shell, /FEATURE_AI_SETTINGS/);
  assert.match(workRoute, /authorizeTenantApi\('work\.manage'\)/);
  assert.match(aiRoute, /authorizeTenantApi\('settings\.manage'\)/);
});

test('segredo da IA nunca é registrado em auditoria', () => {
  assert.match(aiRoute, /hasSecret/);
  assert.doesNotMatch(aiRoute, /after:\s*\{[^}]*apiKey/s);
});
