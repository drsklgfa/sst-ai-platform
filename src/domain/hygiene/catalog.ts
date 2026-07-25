export type HygieneMethodDefinition = {
  code: string;
  name: string;
  category: 'NOISE' | 'HEAT' | 'WHOLE_BODY_VIBRATION' | 'HAND_ARM_VIBRATION' | 'ILLUMINANCE' | 'CHEMICAL' | 'PARTICULATE' | 'BIOLOGICAL' | 'OTHER';
  reference: string;
  currentEdition?: string;
  engine: 'NOISE_DOSE_SUM' | 'IBUTG_INDOOR' | 'IBUTG_OUTDOOR' | 'TWA' | 'VECTOR_MAGNITUDE' | null;
  requiresInstrument: boolean;
  requiredFields: string[];
  limitations: string[];
};

export const hygieneMethodCatalog: readonly HygieneMethodDefinition[] = [
  { code: 'NHO01', name: 'Avaliação da exposição ocupacional ao ruído', category: 'NOISE', reference: 'Fundacentro NHO 01', engine: 'NOISE_DOSE_SUM', requiresInstrument: true, requiredFields: ['doses'], limitations: ['A soma de doses não substitui a validação da jornada, do critério, do nível de corte e da configuração do instrumento.'] },
  { code: 'NHO06', name: 'Avaliação da exposição ocupacional ao calor', category: 'HEAT', reference: 'Fundacentro NHO 06', currentEdition: '3ª edição', engine: 'IBUTG_INDOOR', requiresInstrument: true, requiredFields: ['wetBulbC', 'globeC'], limitations: ['O IBUTG deve ser relacionado à taxa metabólica e ao regime de trabalho e descanso aplicável.'] },
  { code: 'NHO07', name: 'Calibração de bombas pelo método da bolha de sabão', category: 'OTHER', reference: 'Fundacentro NHO 07', engine: null, requiresInstrument: true, requiredFields: [], limitations: ['O registro não substitui a execução do procedimento de calibração conforme a edição adotada.'] },
  { code: 'NHO08', name: 'Coleta de material particulado sólido suspenso no ar', category: 'PARTICULATE', reference: 'Fundacentro NHO 08', engine: 'TWA', requiresInstrument: true, requiredFields: ['samples'], limitations: ['A seleção do amostrador, vazão, filtro e método analítico deve ser definida pelo profissional.'] },
  { code: 'NHO09', name: 'Vibração de corpo inteiro', category: 'WHOLE_BODY_VIBRATION', reference: 'Fundacentro NHO 09', engine: 'VECTOR_MAGNITUDE', requiresInstrument: true, requiredFields: ['x', 'y', 'z'], limitations: ['A magnitude vetorial simples não substitui ponderações, fatores de eixo e critérios da norma.'] },
  { code: 'NHO10', name: 'Vibração de mãos e braços', category: 'HAND_ARM_VIBRATION', reference: 'Fundacentro NHO 10', engine: 'VECTOR_MAGNITUDE', requiresInstrument: true, requiredFields: ['x', 'y', 'z'], limitations: ['A magnitude vetorial simples não substitui normalização temporal e critérios técnicos aplicáveis.'] },
  { code: 'NHO11', name: 'Avaliação dos níveis de iluminamento em ambientes internos', category: 'ILLUMINANCE', reference: 'Fundacentro NHO 11', engine: 'TWA', requiresInstrument: true, requiredFields: ['samples'], limitations: ['A malha de medição, tarefas, uniformidade e condições do ambiente devem ser registradas.'] },
  { code: 'NR09_CHEMICAL', name: 'Avaliação de agente químico conforme estratégia definida', category: 'CHEMICAL', reference: 'NR-9 e método analítico aplicável', engine: 'TWA', requiresInstrument: true, requiredFields: ['samples'], limitations: ['O método analítico, limite, vazão, branco de campo e incerteza devem ser definidos e documentados.'] },
  { code: 'NR09_BIOLOGICAL', name: 'Avaliação qualitativa de agente biológico', category: 'BIOLOGICAL', reference: 'NR-9 e critérios técnicos aplicáveis', engine: null, requiresInstrument: false, requiredFields: [], limitations: ['A conclusão qualitativa depende de atividade, fonte, via de exposição, controles e revisão profissional.'] },
  { code: 'CUSTOM', name: 'Método personalizado', category: 'OTHER', reference: 'Referência informada pelo profissional', engine: null, requiresInstrument: false, requiredFields: [], limitations: ['Exige identificação da referência, edição, critérios, entradas, cálculos e limitações.'] },
] as const;

export function hygieneMethod(code: string) {
  return hygieneMethodCatalog.find((item) => item.code === code.trim().toUpperCase()) ?? null;
}

export function methodsForCategory(category: string) {
  const normalized = category.trim().toUpperCase();
  return hygieneMethodCatalog.filter((item) => item.category === normalized || item.code === 'CUSTOM');
}
