import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateWorkflowProgress, normalizedStepProgress } from '../src/domain/workflows/progress.ts';
import { defaultWorkflowDefinitions, workflowDefinitionFor } from '../src/domain/workflows/templates.ts';

test('todos os fluxos comerciais principais possuem etapas e requisitos', () => {
  for (const code of ['AET', 'PGR', 'PCMSO', 'LTCAT', 'INSALUBRIDADE', 'PERICULOSIDADE', 'HIGIENE_OCUPACIONAL', 'TREINAMENTO']) {
    const definition = workflowDefinitionFor(code);
    assert.equal(definition.serviceType, code);
    assert.ok(definition.steps.length >= 3, `${code} deve possuir ao menos três etapas`);
    assert.ok(definition.steps.every((step) => step.requirements.length > 0), `${code} possui etapa sem requisito`);
    const requirementCodes = definition.steps.flatMap((step) => step.requirements.map((item) => item.code));
    assert.equal(new Set(requirementCodes).size, requirementCodes.length, `${code} possui códigos de requisito duplicados`);
  }
  assert.ok(Object.keys(defaultWorkflowDefinitions).length >= 8);
});

test('progresso trata concluído e não aplicável como 100%', () => {
  assert.equal(normalizedStepProgress({ required: true, status: 'NOT_APPLICABLE' }), 100);
  assert.equal(normalizedStepProgress({ required: true, status: 'IN_PROGRESS', completionPercent: 143 }), 99);
  assert.equal(calculateWorkflowProgress([
    { required: true, status: 'COMPLETED' },
    { required: true, status: 'IN_PROGRESS', completionPercent: 50 },
  ]), 75);
});
