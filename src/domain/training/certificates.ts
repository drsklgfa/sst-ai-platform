import { createHash } from 'node:crypto';

export type CertificateEligibility = {
  eligible: boolean;
  reasons: string[];
};

export function certificateEligibility(input: { enrollmentStatus: string; mandatoryLessons: number; completedMandatoryLessons: number; mandatoryAssessments: number; passedAssessments: number; practicalRequired: boolean; practicalApproved: boolean; attendanceRequired?: boolean; attendanceSatisfied?: boolean }): CertificateEligibility {
  const reasons: string[] = [];
  if (input.completedMandatoryLessons < input.mandatoryLessons) reasons.push('Existem aulas obrigatórias não concluídas.');
  if (input.passedAssessments < input.mandatoryAssessments) reasons.push('Existem avaliações obrigatórias sem aprovação.');
  if (input.practicalRequired && !input.practicalApproved) reasons.push('A avaliação prática ainda não foi aprovada.');
  if (input.attendanceRequired && !input.attendanceSatisfied) reasons.push('A presença mínima ainda não foi comprovada.');
  if (['CANCELLED', 'EXPIRED'].includes(input.enrollmentStatus)) reasons.push('A matrícula não está em situação válida para certificação.');
  return { eligible: reasons.length === 0, reasons };
}

export function certificateVerificationHash(input: { tenantId: string; companyId: string; workerId: string; enrollmentId: string; courseCode: string; issuedAt: Date }): string {
  return createHash('sha256').update([input.tenantId, input.companyId, input.workerId, input.enrollmentId, input.courseCode, input.issuedAt.toISOString()].join('|')).digest('hex');
}

export function certificateCode(input: { courseCode: string; issuedAt: Date; hash: string }): string {
  const date = input.issuedAt.toISOString().slice(0, 10).replaceAll('-', '');
  return `${input.courseCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12)}-${date}-${input.hash.slice(0, 10).toUpperCase()}`;
}

export function expiryDate(issuedAt: Date, validityDays: number | null | undefined): Date | null {
  if (!validityDays) return null;
  if (!Number.isInteger(validityDays) || validityDays < 1) throw new Error('Validade do certificado inválida.');
  const date = new Date(issuedAt);
  date.setUTCDate(date.getUTCDate() + validityDays);
  return date;
}
