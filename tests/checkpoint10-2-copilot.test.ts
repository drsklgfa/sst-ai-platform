import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const catalog = readFileSync('src/domain/ai/operational-tools.ts', 'utf8');
const tools = readFileSync('src/lib/ai-tools.ts', 'utf8');
const orchestrator = readFileSync('src/lib/ai-orchestrator.ts', 'utf8');
const threadRoute = readFileSync('src/app/api/copilot/threads/route.ts', 'utf8');
const messageRoute = readFileSync('src/app/api/copilot/threads/[id]/messages/route.ts', 'utf8');
const approvalRoute = readFileSync('src/app/api/copilot/approvals/[id]/route.ts', 'utf8');
const revertRoute = readFileSync('src/app/api/copilot/change-sets/[id]/revert/route.ts', 'utf8');
const shell = readFileSync('src/components/app-shell.tsx', 'utf8');
const env = readFileSync('src/lib/env.ts', 'utf8');

const allowedTools = [
  'search_companies',
  'get_company_context',
  'list_work_projects',
  'check_work_project_pending',
  'create_work_project',
  'create_establishment',
  'create_sector',
  'create_ghe',
  'create_job_function',
  'create_workstation',
  'create_inspection',
  'update_work_requirement',
];

test('catálogo do copiloto expõe somente ferramentas específicas e controladas', () => {
  for (const name of allowedTools) assert.match(catalog, new RegExp(`name: '${name}'`));
  for (const forbidden of ['execute_sql', 'run_shell', 'delete_any', 'database_query', 'http_request']) assert.doesNotMatch(catalog, new RegExp(forbidden));
  assert.match(catalog, /additionalProperties: false/);
});

test('ações de escrita têm risco, permissão e reversibilidade explícitos', () => {
  assert.match(catalog, /permission: 'company\.write', mutating: true, reversible: true/);
  assert.match(catalog, /permission: 'work\.manage', mutating: true, reversible: true/);
  assert.match(catalog, /permission: 'inspection\.manage', mutating: true, reversible: true/);
  assert.match(catalog, /riskLevel: 'MEDIUM'/);
  assert.match(catalog, /riskLevel: 'HIGH'/);
});

test('execução valida tenant, permissão, aprovação e idempotência de estado', () => {
  assert.match(tools, /hasTenantPermission\(actor\.role, spec\.permission/);
  assert.match(tools, /tenantId: actor\.tenantId/);
  assert.match(tools, /Ação ainda não aprovada/);
  assert.match(tools, /if \(execution\.status === 'SUCCEEDED'\) return execution/);
  assert.match(tools, /AI_TOOL_EXECUTED/);
});

test('changeset suporta vínculo global, ferramenta e desfazer auditável', () => {
  assert.match(schema, /model ChangeSet \{[\s\S]*?workProjectId String\?/);
  assert.match(schema, /model ApprovalRequest \{[\s\S]*?workProjectId String\?/);
  assert.match(schema, /changeSetId\s+String\?/);
  assert.match(schema, /toolExecutions AIToolExecution\[\]/);
  assert.match(tools, /AI_CHANGESET_REVERTED/);
  assert.match(tools, /DELETE_EMPTY_INSPECTION/);
  assert.match(tools, /RESTORE_REQUIREMENT/);
});

test('orquestrador persiste conversa, uso e limita ciclos de ferramentas', () => {
  assert.match(orchestrator, /aIMessage\.create/);
  assert.match(orchestrator, /aIUsageRecord\.create/);
  assert.match(orchestrator, /for \(let round = 0; round < 3; round \+= 1\)/);
  assert.match(orchestrator, /operationalToolCatalog\.filter\(\(item\) => !item\.mutating\)/);
  assert.match(orchestrator, /Nunca invente IDs, medições, resultados/);
});

test('rotas do copiloto exigem feature flag e autorização interna', () => {
  assert.match(env, /FEATURE_AI_COPILOT/);
  assert.match(shell, /FEATURE_AI_COPILOT/);
  for (const route of [threadRoute, messageRoute, approvalRoute, revertRoute]) {
    assert.match(route, /FEATURE_AI_COPILOT/);
    assert.match(route, /authorizeTenantApi\('work\.manage'\)/);
  }
});

test('aprovação humana decide antes da execução e rejeição cancela a ação', () => {
  assert.match(approvalRoute, /status: 'APPROVED'/);
  assert.match(approvalRoute, /runToolExecution/);
  assert.match(approvalRoute, /status: 'REJECTED'/);
  assert.match(approvalRoute, /status: 'CANCELLED'/);
});

test('desfazer somente encontra alterações pertencentes ao tenant', () => {
  assert.match(revertRoute, /toolExecutions: \{ some: \{ tenantId: tenant\.id \} \}/);
  assert.match(tools, /toolExecutions: \{ some: \{ tenantId: actor\.tenantId \} \}/);
});
