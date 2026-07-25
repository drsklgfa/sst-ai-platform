export type AutonomyMode = 'ASSISTANT' | 'COPILOT' | 'SUPERVISED_AUTONOMY';
export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DataPolicyMode = 'MANUAL' | 'PROTECTED' | 'PROFESSIONAL';

export type ToolPolicyDecision = {
  allowed: boolean;
  approvalRequired: boolean;
  reason: string;
};

export function decideToolPolicy(input: {
  autonomy: AutonomyMode;
  riskLevel: ToolRiskLevel;
  dataPolicy: DataPolicyMode;
  containsSensitiveHealthData?: boolean;
  containsIdentifiableWorkerData?: boolean;
}): ToolPolicyDecision {
  if (input.dataPolicy === 'MANUAL') {
    return { allowed: false, approvalRequired: false, reason: 'A inteligência artificial está desativada para ações.' };
  }

  if (input.dataPolicy === 'PROTECTED' && (input.containsSensitiveHealthData || input.containsIdentifiableWorkerData)) {
    return { allowed: false, approvalRequired: false, reason: 'O perfil protegido bloqueia dados pessoais ou de saúde identificáveis.' };
  }

  if (input.autonomy === 'ASSISTANT') {
    return { allowed: false, approvalRequired: false, reason: 'O modo Assistente apenas pesquisa, organiza e prepara sugestões.' };
  }

  if (input.autonomy === 'COPILOT') {
    return { allowed: true, approvalRequired: true, reason: 'O modo Copiloto exige confirmação antes de executar ferramentas.' };
  }

  if (input.riskLevel === 'HIGH' || input.riskLevel === 'CRITICAL') {
    return { allowed: true, approvalRequired: true, reason: 'Ações críticas sempre exigem aprovação destacada.' };
  }

  return { allowed: true, approvalRequired: input.riskLevel === 'MEDIUM', reason: input.riskLevel === 'MEDIUM' ? 'Ação relevante exige confirmação simples.' : 'Ação segura permitida em autonomia supervisionada.' };
}
