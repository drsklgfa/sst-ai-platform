export type ExposureControlInput = {
  type: 'EPC' | 'EPI' | 'ADMINISTRATIVE' | 'COLLECTIVE_ORGANIZATIONAL';
  effectiveness: 'UNKNOWN' | 'EFFECTIVE' | 'PARTIAL' | 'INEFFECTIVE' | 'NOT_APPLICABLE';
  validFrom?: Date | null;
  validUntil?: Date | null;
  ca?: string | null;
  continuousUse?: boolean | null;
  trainingRecorded?: boolean | null;
  maintenanceRecorded?: boolean | null;
};

export type ProtectionAssessment = {
  epcUsed: boolean;
  epiUsed: boolean;
  epcEffective: boolean;
  epiEffective: boolean;
  canClaimNeutralization: boolean;
  findings: string[];
};

export function assessProtection(controls: ExposureControlInput[], referenceDate = new Date()): ProtectionAssessment {
  const active = controls.filter((control) => {
    if (control.validFrom && control.validFrom > referenceDate) return false;
    if (control.validUntil && control.validUntil < referenceDate) return false;
    return true;
  });
  const epc = active.filter((item) => item.type === 'EPC' || item.type === 'COLLECTIVE_ORGANIZATIONAL');
  const epi = active.filter((item) => item.type === 'EPI');
  const epcEffective = epc.some((item) => item.effectiveness === 'EFFECTIVE' && item.maintenanceRecorded !== false);
  const epiEffective = epi.some((item) => item.effectiveness === 'EFFECTIVE' && Boolean(item.ca) && item.continuousUse === true && item.trainingRecorded === true);
  const findings: string[] = [];
  if (epi.length && !epi.some((item) => item.ca)) findings.push('EPI informado sem CA ou documento de avaliação registrado.');
  if (epi.some((item) => item.effectiveness === 'EFFECTIVE' && item.continuousUse !== true)) findings.push('Eficácia do EPI exige comprovação de uso contínuo quando aplicável.');
  if (epi.some((item) => item.effectiveness === 'EFFECTIVE' && item.trainingRecorded !== true)) findings.push('Eficácia do EPI exige registro de orientação ou treinamento.');
  if (epc.some((item) => item.effectiveness === 'EFFECTIVE' && item.maintenanceRecorded === false)) findings.push('EPC indicado como eficaz possui manutenção não comprovada.');
  return { epcUsed: epc.length > 0, epiUsed: epi.length > 0, epcEffective, epiEffective, canClaimNeutralization: epcEffective || epiEffective, findings };
}
