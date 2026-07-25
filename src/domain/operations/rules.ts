export type DatedStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING';

export function datedStatus(date: Date | null | undefined, reference = new Date(), warningDays = 30): DatedStatus {
  if (!date) return 'MISSING';
  const time = date.getTime();
  if (!Number.isFinite(time)) return 'MISSING';
  if (time < reference.getTime()) return 'EXPIRED';
  if (time <= reference.getTime() + warningDays * 86_400_000) return 'EXPIRING';
  return 'VALID';
}

export function ppeDeliveryEligible(input: {
  caExpiresAt?: Date | null;
  trainingConfirmed: boolean;
  fitConfirmed: boolean;
  stockQuantity: number;
  quantity: number;
  reference?: Date;
}) {
  const ca = datedStatus(input.caExpiresAt, input.reference);
  const reasons: string[] = [];
  if (ca === 'EXPIRED') reasons.push('CA vencido');
  if (ca === 'MISSING') reasons.push('CA não informado');
  if (!input.trainingConfirmed) reasons.push('orientação ou treinamento não confirmado');
  if (!input.fitConfirmed) reasons.push('adequação ao trabalhador não confirmada');
  if (!Number.isInteger(input.quantity) || input.quantity < 1) reasons.push('quantidade inválida');
  if (input.stockQuantity < input.quantity) reasons.push('estoque insuficiente');
  return { eligible: reasons.length === 0, caStatus: ca, reasons };
}

export function permitEligibility(input: {
  startsAt: Date;
  endsAt: Date;
  checklistItems: number;
  completedChecklistItems: number;
  controlCount: number;
  workerCount: number;
  approverUserId?: string | null;
  measurementsRequired?: boolean;
  measurementCount?: number;
}) {
  const reasons: string[] = [];
  if (!(input.startsAt instanceof Date) || !(input.endsAt instanceof Date) || input.endsAt <= input.startsAt) reasons.push('período inválido');
  if (input.checklistItems < 1 || input.completedChecklistItems < input.checklistItems) reasons.push('checklist incompleto');
  if (input.controlCount < 1) reasons.push('medidas de controle ausentes');
  if (input.workerCount < 1) reasons.push('equipe não identificada');
  if (!input.approverUserId) reasons.push('aprovador não definido');
  if (input.measurementsRequired && (input.measurementCount ?? 0) < 1) reasons.push('medição obrigatória ausente');
  return { eligible: reasons.length === 0, reasons };
}

export function contractorComplianceScore(input: {
  requiredDocuments: number;
  validDocuments: number;
  requiredWorkers: number;
  clearedWorkers: number;
  riskSharingDefined: boolean;
  integrationCompleted: boolean;
}) {
  const ratios = [
    input.requiredDocuments ? input.validDocuments / input.requiredDocuments : 1,
    input.requiredWorkers ? input.clearedWorkers / input.requiredWorkers : 1,
    input.riskSharingDefined ? 1 : 0,
    input.integrationCompleted ? 1 : 0,
  ];
  const score = Math.max(0, Math.min(100, Math.round((ratios.reduce((sum, value) => sum + Math.max(0, Math.min(1, value)), 0) / ratios.length) * 100)));
  const status = score === 100 ? 'COMPLIANT' : score >= 70 ? 'PARTIAL' : 'NON_COMPLIANT';
  return { score, status } as const;
}

export function incidentEscalation(input: {
  kind: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  workerInvolved: boolean;
  lostTime: boolean;
  fatality: boolean;
}) {
  const catRequired = input.workerInvolved && ['ACCIDENT', 'OCCUPATIONAL_DISEASE'].includes(input.kind);
  const esocialS2210Required = catRequired;
  const immediateNotification = input.fatality || input.severity === 'CRITICAL';
  const formalInvestigation = input.fatality || input.lostTime || ['HIGH', 'CRITICAL'].includes(input.severity);
  return { catRequired, esocialS2210Required, immediateNotification, formalInvestigation };
}

export function obligationState(input: { dueAt?: Date | null; completedAt?: Date | null; waived?: boolean; reference?: Date }) {
  if (input.waived) return 'WAIVED' as const;
  if (input.completedAt) return 'COMPLIANT' as const;
  if (input.dueAt && input.dueAt < (input.reference ?? new Date())) return 'OVERDUE' as const;
  return 'PENDING' as const;
}
