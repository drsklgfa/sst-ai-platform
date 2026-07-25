import { calculateNiosh, type NioshInput } from '../engines/niosh.ts';
import { calculateReba, type RebaInput } from '../engines/reba.ts';
import { calculateRula, type RulaInput } from '../engines/rula.ts';
import { ergonomicMethod } from './catalog.ts';

export type ErgonomicMethodCode = NonNullable<ReturnType<typeof ergonomicMethod>>['code'];

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Entradas do método devem ser um objeto');
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, raw]) => {
    const number = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(number)) throw new Error(`Entrada ${key} deve ser numérica`);
    return [key, number];
  }));
}

export function validateMethodInputs(methodCode: string, input: unknown): string[] {
  const method = ergonomicMethod(methodCode);
  if (!method) return ['Método ergonômico não reconhecido.'];
  if (!method.engineAvailable) return [];
  let values: Record<string, number>;
  try { values = numericRecord(input); } catch (error) { return [error instanceof Error ? error.message : 'Entradas inválidas.']; }
  return method.requiredInputs.filter((key) => !Number.isFinite(values[key])).map((key) => `Campo obrigatório ausente: ${key}.`);
}

export function calculateErgonomicMethod(methodCode: string, input: unknown) {
  const method = ergonomicMethod(methodCode);
  if (!method) throw new Error('Método ergonômico não reconhecido');
  const errors = validateMethodInputs(method.code, input);
  if (errors.length) throw new Error(errors.join(' '));
  if (!method.engineAvailable) {
    return {
      method: method.code,
      calculated: false,
      score: null,
      classification: null,
      engineVersion: null,
      output: {},
      limitations: method.limitations,
      reviewRequired: true,
    };
  }
  const values = numericRecord(input);
  if (method.code === 'RULA') {
    const output = calculateRula(values as unknown as RulaInput);
    return { method: method.code, calculated: true, score: output.score, classification: output.action, engineVersion: 'rula-v1', output, limitations: method.limitations, reviewRequired: true };
  }
  if (method.code === 'REBA') {
    const output = calculateReba(values as unknown as RebaInput);
    return { method: method.code, calculated: true, score: output.score, classification: output.level, engineVersion: 'reba-v1', output, limitations: method.limitations, reviewRequired: true };
  }
  const output = calculateNiosh(values as unknown as NioshInput);
  return { method: method.code, calculated: true, score: output.liftingIndex, classification: output.classification, engineVersion: 'niosh-v1', output, limitations: method.limitations, reviewRequired: true };
}
