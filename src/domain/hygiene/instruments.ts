export type CalibrationState = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'REJECTED' | 'PENDING';

const day = 86_400_000;

export function calibrationState(input: { calibratedAt?: Date | null; validUntil?: Date | null; rejected?: boolean; pending?: boolean }, referenceDate = new Date(), warningDays = 30): CalibrationState {
  if (input.rejected) return 'REJECTED';
  if (input.pending || !input.calibratedAt || !input.validUntil) return 'PENDING';
  const remaining = input.validUntil.getTime() - referenceDate.getTime();
  if (remaining < 0) return 'EXPIRED';
  if (remaining <= warningDays * day) return 'EXPIRING';
  return 'VALID';
}

export function canUseInstrument(input: { status: string; calibrationRequired: boolean; calibrationStatus?: CalibrationState | null }) {
  const findings: string[] = [];
  if (!['AVAILABLE', 'RESERVED', 'IN_USE'].includes(input.status)) findings.push(`Instrumento indisponível: ${input.status}.`);
  if (input.calibrationRequired && !['VALID', 'EXPIRING'].includes(input.calibrationStatus ?? 'PENDING')) findings.push('Instrumento sem calibração válida para uso.');
  return { allowed: findings.length === 0, findings };
}

export function validateFieldCalibration(input: { before?: number | null; after?: number | null; tolerance?: number | null }) {
  if (input.before == null || input.after == null) return { valid: false, deviation: null, findings: ['Calibrações de campo antes e após a medição são necessárias quando aplicáveis.'] };
  const deviation = Math.abs(input.after - input.before);
  const tolerance = input.tolerance ?? 0.5;
  return { valid: deviation <= tolerance, deviation, findings: deviation <= tolerance ? [] : [`Desvio de calibração de campo (${deviation.toFixed(2)}) supera a tolerância (${tolerance.toFixed(2)}).`] };
}
