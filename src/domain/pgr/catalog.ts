export const PGR_MINIMUM_INVENTORY_BLOCKS = [
  { code: 'processes_environments', label: 'Caracterização dos processos e ambientes de trabalho' },
  { code: 'activities', label: 'Caracterização das atividades' },
  { code: 'hazards_harms_sources', label: 'Perigos, possíveis lesões ou agravos, fontes e circunstâncias' },
  { code: 'exposed_groups_controls', label: 'Grupos expostos e medidas de prevenção implementadas' },
  { code: 'monitoring_ergonomics', label: 'Monitoramento de exposições e resultados ergonômicos aplicáveis' },
  { code: 'risk_classification', label: 'Avaliação e classificação dos riscos' },
  { code: 'decision_criteria', label: 'Critérios de avaliação e tomada de decisão' },
] as const;

export const PGR_HAZARD_CATEGORIES = [
  'PHYSICAL',
  'CHEMICAL',
  'BIOLOGICAL',
  'ERGONOMIC',
  'PSYCHOSOCIAL',
  'ACCIDENT',
  'OTHER',
] as const;

export type PgrHazardCategory = typeof PGR_HAZARD_CATEGORIES[number];

export const PSYCHOSOCIAL_DIMENSION_HINTS = [
  'demandas e carga de trabalho',
  'controle e autonomia',
  'apoio social e da liderança',
  'clareza de papel',
  'reconhecimento e justiça organizacional',
  'violência, assédio e discriminação',
  'mudanças organizacionais',
  'jornada, pausas e recuperação',
  'conflito trabalho-vida',
] as const;
