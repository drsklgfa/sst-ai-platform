export const defaultPcmsoExamCatalog = [
  { code: 'CLINICAL_OCCUPATIONAL', name: 'Avaliação clínica ocupacional', kind: 'CLINICAL' as const, description: 'Avaliação clínica definida pelo médico responsável conforme riscos ocupacionais.' },
  { code: 'AUDIOMETRY', name: 'Audiometria ocupacional', kind: 'COMPLEMENTARY' as const, description: 'Exame complementar quando tecnicamente indicado.' },
  { code: 'SPIROMETRY', name: 'Espirometria', kind: 'COMPLEMENTARY' as const, description: 'Exame complementar quando tecnicamente indicado.' },
  { code: 'VISION', name: 'Avaliação da acuidade visual', kind: 'COMPLEMENTARY' as const, description: 'Avaliação complementar quando tecnicamente indicada.' },
  { code: 'LABORATORY', name: 'Exame laboratorial ocupacional', kind: 'COMPLEMENTARY' as const, description: 'Exame complementar definido pelo protocolo médico.' },
] as const;

export const occupationalExamTypeLabels: Record<string, string> = {
  ADMISSION: 'Admissional',
  PERIODIC: 'Periódico',
  RETURN_TO_WORK: 'Retorno ao trabalho',
  RISK_CHANGE: 'Mudança de risco ocupacional',
  TERMINATION: 'Demissional',
};
