export type ErgonomicMethodDefinition = {
  code: 'RULA' | 'REBA' | 'NIOSH' | 'STRAIN_INDEX' | 'OCRA_CHECKLIST' | 'ROSA' | 'QEC' | 'SNOOK_CIRIELLO' | 'MANUAL' | 'CUSTOM';
  name: string;
  dimension: 'PHYSICAL' | 'COGNITIVE' | 'ORGANIZATIONAL' | 'PSYCHOSOCIAL' | 'ENVIRONMENTAL' | 'OTHER';
  engineAvailable: boolean;
  requiredInputs: string[];
  limitations: string[];
};

export const ergonomicMethodCatalog: readonly ErgonomicMethodDefinition[] = [
  {
    code: 'RULA',
    name: 'RULA — Rapid Upper Limb Assessment',
    dimension: 'PHYSICAL',
    engineAvailable: true,
    requiredInputs: ['upperArm', 'lowerArm', 'wrist', 'wristTwist', 'neck', 'trunk', 'legs'],
    limitations: ['Método observacional; não substitui análise da atividade, frequência, duração, força e variabilidade.'],
  },
  {
    code: 'REBA',
    name: 'REBA — Rapid Entire Body Assessment',
    dimension: 'PHYSICAL',
    engineAvailable: true,
    requiredInputs: ['trunk', 'neck', 'legs', 'upperArm', 'lowerArm', 'wrist', 'load', 'coupling', 'activity'],
    limitations: ['Método observacional; deve representar a situação real e as posturas relevantes da tarefa.'],
  },
  {
    code: 'NIOSH',
    name: 'Equação revisada de levantamento NIOSH',
    dimension: 'PHYSICAL',
    engineAvailable: true,
    requiredInputs: ['loadKg', 'horizontalCm', 'originHeightCm', 'verticalTravelCm', 'asymmetryDeg', 'frequencyMultiplier', 'couplingMultiplier'],
    limitations: ['Aplicável somente quando os pressupostos da equação forem atendidos; não usar para tarefas incompatíveis sem justificativa.'],
  },
  { code: 'STRAIN_INDEX', name: 'Strain Index', dimension: 'PHYSICAL', engineAvailable: false, requiredInputs: [], limitations: ['Registro estruturado disponível; cálculo depende de motor metodológico validado.'] },
  { code: 'OCRA_CHECKLIST', name: 'OCRA Checklist', dimension: 'PHYSICAL', engineAvailable: false, requiredInputs: [], limitations: ['Registro estruturado disponível; cálculo depende de motor metodológico validado.'] },
  { code: 'ROSA', name: 'ROSA — Rapid Office Strain Assessment', dimension: 'PHYSICAL', engineAvailable: false, requiredInputs: [], limitations: ['Registro estruturado disponível; cálculo depende de motor metodológico validado.'] },
  { code: 'QEC', name: 'QEC — Quick Exposure Check', dimension: 'PHYSICAL', engineAvailable: false, requiredInputs: [], limitations: ['Registro estruturado disponível; cálculo depende de motor metodológico validado.'] },
  { code: 'SNOOK_CIRIELLO', name: 'Tabelas de Snook e Ciriello', dimension: 'PHYSICAL', engineAvailable: false, requiredInputs: [], limitations: ['Registro estruturado disponível; cálculo depende de dados antropométricos e motor validado.'] },
  { code: 'MANUAL', name: 'Avaliação técnica estruturada', dimension: 'OTHER', engineAvailable: false, requiredInputs: [], limitations: ['Resultado informado pelo profissional e sujeito a revisão.'] },
  { code: 'CUSTOM', name: 'Método personalizado', dimension: 'OTHER', engineAvailable: false, requiredInputs: [], limitations: ['Exige identificação da referência, versão, entradas e critérios.'] },
] as const;

export function ergonomicMethod(code: string) {
  return ergonomicMethodCatalog.find((item) => item.code === code.trim().toUpperCase()) ?? null;
}

export const ergonomicOrganizationFields = [
  'normas de produção',
  'modo operatório',
  'exigência de tempo',
  'ritmo de trabalho',
  'conteúdo das tarefas',
  'instrumentos e meios técnicos',
  'aspectos cognitivos',
  'aspectos que possam comprometer a saúde',
] as const;
