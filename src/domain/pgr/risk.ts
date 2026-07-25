import { calculateRisk, type RiskLevel } from '../engines/risk-matrix.ts';
import { PGR_HAZARD_CATEGORIES, type PgrHazardCategory } from './catalog.ts';

export type PgrRiskInput = {
  code: string;
  category: PgrHazardCategory;
  hazard: string;
  source?: string;
  circumstances?: string;
  possibleHarms: string[];
  exposedGroups: string[];
  exposedCount?: number;
  frequency?: string;
  duration?: string;
  existingControls?: string[];
  monitoringData?: Record<string, unknown>;
  severity: number;
  probability: number;
  exposure?: number;
  residualSeverity?: number | null;
  residualProbability?: number | null;
  residualExposure?: number | null;
};

export type AssessedPgrRisk = PgrRiskInput & {
  initialScore: number;
  initialLevel: RiskLevel;
  residualScore: number | null;
  residualLevel: RiskLevel | null;
};

const cleanList = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

export function assessPgrRisk(input: PgrRiskInput): AssessedPgrRisk {
  const code = input.code.trim().toUpperCase();
  const hazard = input.hazard.trim();
  if (!code || code.length > 40) throw new Error('Código do risco é obrigatório e deve ter até 40 caracteres');
  if (!PGR_HAZARD_CATEGORIES.includes(input.category)) throw new Error('Categoria de perigo inválida');
  if (hazard.length < 3 || hazard.length > 300) throw new Error('Perigo deve ter entre 3 e 300 caracteres');
  const possibleHarms = cleanList(input.possibleHarms);
  if (!possibleHarms.length) throw new Error('Informe ao menos uma possível lesão ou agravo');
  const exposedGroups = cleanList(input.exposedGroups);
  if (!exposedGroups.length) throw new Error('Informe ao menos um grupo exposto');
  const exposedCount = Math.max(0, Math.trunc(input.exposedCount ?? 0));
  const initial = calculateRisk(input.severity, input.probability, input.exposure ?? 1);

  const residualValues = [input.residualSeverity, input.residualProbability, input.residualExposure];
  const hasSomeResidual = residualValues.some((value) => value !== null && value !== undefined);
  const hasAllResidual = residualValues.every((value) => value !== null && value !== undefined);
  if (hasSomeResidual && !hasAllResidual) throw new Error('A avaliação residual precisa de severidade, probabilidade e exposição');
  const residual = hasAllResidual
    ? calculateRisk(Number(input.residualSeverity), Number(input.residualProbability), Number(input.residualExposure))
    : null;

  return {
    ...input,
    code,
    hazard,
    possibleHarms,
    exposedGroups,
    exposedCount,
    existingControls: cleanList(input.existingControls ?? []),
    initialScore: initial.score,
    initialLevel: initial.level,
    residualScore: residual?.score ?? null,
    residualLevel: residual?.level ?? null,
  };
}

export function actionPriorityForRisk(level: RiskLevel): 'BAIXA' | 'MÉDIA' | 'ALTA' | 'IMEDIATA' {
  if (level === 'CRITICAL') return 'IMEDIATA';
  if (level === 'HIGH') return 'ALTA';
  if (level === 'MODERATE') return 'MÉDIA';
  return 'BAIXA';
}

export function needsActionPlan(level: RiskLevel): boolean {
  return ['MODERATE', 'HIGH', 'CRITICAL'].includes(level);
}
