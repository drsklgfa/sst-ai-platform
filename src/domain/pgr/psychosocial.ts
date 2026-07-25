import type { RiskLevel } from '../engines/risk-matrix.ts';

export type PsychosocialDimensionInput = {
  dimension: string;
  score: number;
  responseCount: number;
  groups?: string[];
};

export type PsychosocialDimensionResult = {
  dimension: string;
  score: number | null;
  responseCount: number;
  level: RiskLevel | null;
  disclosure: 'WITHHELD' | 'AGGREGATED' | 'DETAILED';
  groups: string[];
};

export function psychosocialRiskLevel(score: number): RiskLevel {
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('Pontuação psicossocial deve estar entre 0 e 100');
  if (score < 20) return 'VERY_LOW';
  if (score < 40) return 'LOW';
  if (score < 60) return 'MODERATE';
  if (score < 80) return 'HIGH';
  return 'CRITICAL';
}

export function protectPsychosocialDimensions(
  dimensions: PsychosocialDimensionInput[],
  minimumGroupSize = 5,
  detailedGroupSize = 10,
): PsychosocialDimensionResult[] {
  if (!Number.isInteger(minimumGroupSize) || minimumGroupSize < 3) throw new Error('Grupo mínimo deve ser ao menos 3');
  if (!Number.isInteger(detailedGroupSize) || detailedGroupSize < minimumGroupSize) throw new Error('Grupo detalhado deve ser maior ou igual ao grupo mínimo');
  return dimensions.map((item) => {
    const dimension = item.dimension.trim();
    if (!dimension) throw new Error('Dimensão psicossocial é obrigatória');
    const responseCount = Math.max(0, Math.trunc(item.responseCount));
    const groups = [...new Set((item.groups ?? []).map((value) => value.trim()).filter(Boolean))];
    if (responseCount < minimumGroupSize) {
      return { dimension, score: null, responseCount, level: null, disclosure: 'WITHHELD', groups: [] };
    }
    const score = Number(item.score.toFixed(1));
    return {
      dimension,
      score,
      responseCount,
      level: psychosocialRiskLevel(score),
      disclosure: responseCount >= detailedGroupSize ? 'DETAILED' : 'AGGREGATED',
      groups: responseCount >= detailedGroupSize ? groups : [],
    };
  });
}

export function psychosocialSummary(results: PsychosocialDimensionResult[]) {
  const visible = results.filter((item) => item.score !== null && item.level !== null);
  const critical = visible.filter((item) => ['HIGH', 'CRITICAL'].includes(item.level!));
  return {
    visibleDimensions: visible.length,
    withheldDimensions: results.length - visible.length,
    criticalDimensions: critical.map((item) => item.dimension),
    highestScore: visible.length ? Math.max(...visible.map((item) => item.score!)) : null,
    statement: visible.length
      ? `${critical.length} dimensão(ões) em nível alto ou crítico entre ${visible.length} dimensão(ões) divulgáveis.`
      : 'A amostra não atingiu o mínimo necessário para divulgação agregada.',
  };
}
