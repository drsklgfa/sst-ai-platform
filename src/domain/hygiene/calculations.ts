import { hygieneMethod } from './catalog.ts';

export type WeightedSample = { value: number; minutes: number };

const finite = (value: unknown, field: string) => {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} deve ser numérico`);
  return number;
};

export function calculateTimeWeightedAverage(samples: WeightedSample[]) {
  if (!samples.length) throw new Error('Ao menos uma amostra é obrigatória');
  const normalized = samples.map((sample, index) => ({ value: finite(sample.value, `Amostra ${index + 1}`), minutes: finite(sample.minutes, `Duração ${index + 1}`) }));
  if (normalized.some((sample) => sample.minutes <= 0)) throw new Error('A duração das amostras deve ser positiva');
  const totalMinutes = normalized.reduce((sum, sample) => sum + sample.minutes, 0);
  const weightedSum = normalized.reduce((sum, sample) => sum + sample.value * sample.minutes, 0);
  return { result: weightedSum / totalMinutes, totalMinutes, calculation: 'Σ(valor × minutos) / Σ(minutos)', samples: normalized };
}

export function calculateIbutg(input: { wetBulbC: number; globeC: number; dryBulbC?: number; solarLoad?: boolean }) {
  const wet = finite(input.wetBulbC, 'Temperatura de bulbo úmido natural');
  const globe = finite(input.globeC, 'Temperatura de globo');
  const solarLoad = input.solarLoad === true;
  if (solarLoad) {
    const dry = finite(input.dryBulbC, 'Temperatura de bulbo seco');
    return { result: 0.7 * wet + 0.2 * globe + 0.1 * dry, formula: '0,7 Tbn + 0,2 Tg + 0,1 Tbs', solarLoad: true };
  }
  return { result: 0.7 * wet + 0.3 * globe, formula: '0,7 Tbn + 0,3 Tg', solarLoad: false };
}

export function calculateNoiseDoseSum(doses: number[]) {
  if (!doses.length) throw new Error('Ao menos uma dose parcial é obrigatória');
  const normalized = doses.map((dose, index) => finite(dose, `Dose ${index + 1}`));
  if (normalized.some((dose) => dose < 0)) throw new Error('Dose não pode ser negativa');
  return { result: normalized.reduce((sum, dose) => sum + dose, 0), unit: '%', doses: normalized, calculation: 'Σ doses parciais' };
}

export function calculateVectorMagnitude(input: { x: number; y: number; z: number }) {
  const x = finite(input.x, 'Eixo x'); const y = finite(input.y, 'Eixo y'); const z = finite(input.z, 'Eixo z');
  return { result: Math.sqrt(x ** 2 + y ** 2 + z ** 2), axes: { x, y, z }, calculation: '√(x² + y² + z²)' };
}

export function interpretHygieneResult(input: { result?: number | null; actionLevel?: number | null; toleranceLimit?: number | null }) {
  if (input.result == null || !Number.isFinite(input.result)) return 'INCONCLUSIVE' as const;
  if (input.toleranceLimit != null && Number.isFinite(input.toleranceLimit) && input.result > input.toleranceLimit) return 'ABOVE_LIMIT' as const;
  if (input.actionLevel != null && Number.isFinite(input.actionLevel) && input.result >= input.actionLevel) return 'BETWEEN_ACTION_AND_LIMIT' as const;
  if (input.actionLevel != null || input.toleranceLimit != null) return 'BELOW_ACTION_LEVEL' as const;
  return 'INCONCLUSIVE' as const;
}

export function calculateHygieneMethod(methodCode: string, input: Record<string, unknown>) {
  const method = hygieneMethod(methodCode);
  if (!method) throw new Error('Método de higiene ocupacional não reconhecido');
  if (!method.engine) return { method: method.code, calculated: false, result: null, calculationMemory: {}, limitations: method.limitations, reviewRequired: true };
  let output: Record<string, unknown>;
  if (method.engine === 'NOISE_DOSE_SUM') output = calculateNoiseDoseSum((input.doses as number[]) ?? []);
  else if (method.engine === 'IBUTG_INDOOR' || method.engine === 'IBUTG_OUTDOOR') output = calculateIbutg({ wetBulbC: finite(input.wetBulbC, 'wetBulbC'), globeC: finite(input.globeC, 'globeC'), dryBulbC: input.dryBulbC == null ? undefined : finite(input.dryBulbC, 'dryBulbC'), solarLoad: input.solarLoad === true });
  else if (method.engine === 'VECTOR_MAGNITUDE') output = calculateVectorMagnitude({ x: finite(input.x, 'x'), y: finite(input.y, 'y'), z: finite(input.z, 'z') });
  else output = calculateTimeWeightedAverage((input.samples as WeightedSample[]) ?? []);
  return { method: method.code, calculated: true, result: Number(output.result), calculationMemory: output, limitations: method.limitations, reviewRequired: true };
}
