import assert from 'node:assert/strict';
import test from 'node:test';
import { decideToolPolicy } from '../src/domain/ai/policy.ts';
import { normalizeProviderSettings } from '../src/domain/ai/capabilities.ts';

test('modo protegido bloqueia dados identificáveis', () => {
  const decision = decideToolPolicy({
    autonomy: 'SUPERVISED_AUTONOMY',
    riskLevel: 'LOW',
    dataPolicy: 'PROTECTED',
    containsIdentifiableWorkerData: true,
  });
  assert.equal(decision.allowed, false);
});

test('ações críticas sempre exigem aprovação', () => {
  const decision = decideToolPolicy({ autonomy: 'SUPERVISED_AUTONOMY', riskLevel: 'CRITICAL', dataPolicy: 'PROFESSIONAL' });
  assert.equal(decision.allowed, true);
  assert.equal(decision.approvalRequired, true);
});

test('configuração de provedor aplica limites e padrões seguros', () => {
  const settings = normalizeProviderSettings({ dailyRequestLimit: -1, monthlyBudgetCents: 5000, autonomy: 'INVALID', capabilities: { tools: true } }, 'OPENAI');
  assert.equal(settings.dailyRequestLimit, 100);
  assert.equal(settings.monthlyBudgetCents, 5000);
  assert.equal(settings.autonomy, 'ASSISTANT');
  assert.equal(settings.dataPolicy, 'PROTECTED');
  assert.equal(settings.capabilities.tools, true);
});
