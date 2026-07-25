import assert from 'node:assert/strict';
import test from 'node:test';
import { detectFactConflicts, factNeedsReview, normalizeCnpj, normalizedComparable } from '../src/domain/legacy-import/consolidation.ts';

test('normaliza CNPJ numérico ou alfanumérico com 14 posições', () => {
  assert.equal(normalizeCnpj('12.345.678/0001-90'), '12345678000190');
  assert.equal(normalizeCnpj('AB.C12.3D4/EF56-78'), 'ABC123D4EF5678');
  assert.equal(normalizeCnpj('123'), null);
  assert.equal(normalizeCnpj('ABC123D4EF56XY'), null);
});

test('comparação canônica preserva arrays e ignora ordem das chaves', () => {
  assert.equal(normalizedComparable({ b: 2, a: [1, 3] }), normalizedComparable({ a: [1, 3], b: 2 }));
  assert.notEqual(normalizedComparable([1, 2]), normalizedComparable([2, 1]));
});

test('detecta divergência no mesmo campo e não mistura entidades', () => {
  const conflicts = detectFactConflicts([
    { id: '1', entityType: 'COMPANY', entityKey: null, fieldPath: 'employeeCount', value: 74, normalizedValue: null, confidence: 98 },
    { id: '2', entityType: 'COMPANY', entityKey: null, fieldPath: 'employeeCount', value: 81, normalizedValue: null, confidence: 97 },
    { id: '3', entityType: 'ESTABLISHMENT', entityKey: 'filial', fieldPath: 'employeeCount', value: 81, normalizedValue: null, confidence: 90 },
  ]);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].factIds, ['1', '2']);
});

test('dados médicos e baixa confiança exigem revisão individual', () => {
  assert.equal(factNeedsReview(99, 'MEDICAL_SENSITIVE'), true);
  assert.equal(factNeedsReview(84, 'COMPANY'), true);
  assert.equal(factNeedsReview(85, 'COMPANY'), false);
});
