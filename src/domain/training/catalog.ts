export type TrainingTemplate = {
  code: string;
  title: string;
  description: string;
  legalReferences: string[];
  recommendedModality: 'PRESENTIAL' | 'LIVE_ONLINE' | 'E_LEARNING' | 'BLENDED';
  requiresPractical: boolean;
  riskTags: string[];
  notes: string[];
};

export const trainingTemplateCatalog: TrainingTemplate[] = [
  { code: 'SST_INTEGRATION', title: 'Integração de Segurança e Saúde no Trabalho', description: 'Integração geral com riscos, medidas, emergências, responsabilidades e canais de comunicação da organização.', legalReferences: ['NR-1'], recommendedModality: 'BLENDED', requiresPractical: false, riskTags: ['GENERAL', 'NEW_HIRE'], notes: ['A carga horária e o conteúdo devem ser definidos conforme os riscos e requisitos aplicáveis.'] },
  { code: 'NR05_CIPA', title: 'Capacitação da CIPA e representantes', description: 'Conteúdo para membros da CIPA, representantes e participantes do processo preventivo.', legalReferences: ['NR-5'], recommendedModality: 'BLENDED', requiresPractical: false, riskTags: ['CIPA'], notes: ['Validar dimensionamento, público e conteúdo conforme a situação da empresa.'] },
  { code: 'NR06_EPI', title: 'Uso, guarda e conservação de EPI', description: 'Seleção, uso correto, limitações, higienização, substituição e responsabilidades.', legalReferences: ['NR-6'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['PPE', 'CHEMICAL', 'PHYSICAL', 'BIOLOGICAL'], notes: ['A parte prática deve demonstrar ajuste, colocação, retirada e limitações do EPI aplicável.'] },
  { code: 'NR10_ELECTRICAL', title: 'Segurança em instalações e serviços em eletricidade', description: 'Trilha configurável para atividades com eletricidade.', legalReferences: ['NR-10'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['ELECTRICAL'], notes: ['Não aplicar uma carga horária genérica: selecionar o curso e os módulos conforme atividade, autorização e anexo aplicável.'] },
  { code: 'NR11_MATERIAL_HANDLING', title: 'Movimentação, armazenagem e manuseio de materiais', description: 'Operação segura de equipamentos e movimentação de materiais.', legalReferences: ['NR-11'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['FORKLIFT', 'MATERIAL_HANDLING'], notes: ['A avaliação prática deve ser específica ao equipamento e à atividade.'] },
  { code: 'NR12_MACHINERY', title: 'Segurança no trabalho em máquinas e equipamentos', description: 'Riscos, proteções, procedimentos, bloqueios, inspeção e operação segura.', legalReferences: ['NR-12'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['MACHINERY', 'LOCKOUT'], notes: ['Vincular o conteúdo às máquinas efetivamente utilizadas.'] },
  { code: 'NR18_CONSTRUCTION', title: 'Integração e capacitação para construção', description: 'Trilha para riscos e atividades da construção.', legalReferences: ['NR-18'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['CONSTRUCTION'], notes: ['Selecionar módulos conforme fase da obra e atividades exercidas.'] },
  { code: 'NR20_FLAMMABLES', title: 'Segurança com inflamáveis e combustíveis', description: 'Prevenção, controle, emergência e procedimentos com inflamáveis e combustíveis.', legalReferences: ['NR-20'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['FLAMMABLE', 'FUEL'], notes: ['O nível e a carga devem ser definidos conforme instalação, classe e atividade.'] },
  { code: 'NR23_FIRE', title: 'Prevenção e resposta a emergências e incêndios', description: 'Reconhecimento de cenários, comunicação, evacuação e uso seguro dos meios disponíveis.', legalReferences: ['NR-23', 'legislação estadual aplicável'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['FIRE', 'EMERGENCY'], notes: ['Observar as exigências do Corpo de Bombeiros e regras locais.'] },
  { code: 'NR32_HEALTHCARE', title: 'Segurança e saúde em serviços de saúde', description: 'Riscos biológicos, químicos, perfurocortantes, resíduos e medidas de prevenção.', legalReferences: ['NR-32'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['HEALTHCARE', 'BIOLOGICAL', 'SHARPS'], notes: ['Personalizar para o serviço e os agentes presentes.'] },
  { code: 'NR33_CONFINED_SPACE', title: 'Segurança em espaços confinados', description: 'Trilha para trabalhadores autorizados, vigias, supervisores e equipes de emergência.', legalReferences: ['NR-33'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['CONFINED_SPACE'], notes: ['O perfil do curso deve corresponder à função exercida.'] },
  { code: 'NR35_HEIGHT', title: 'Trabalho em altura', description: 'Planejamento, análise de risco, sistemas de proteção, emergência e condutas seguras.', legalReferences: ['NR-35'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['HEIGHT'], notes: ['Exigir avaliação prática e compatibilidade com a atividade real.'] },
  { code: 'PSYCHOSOCIAL_PREVENTION', title: 'Prevenção de riscos psicossociais, violência e assédio', description: 'Organização do trabalho, canais, condutas, prevenção, acolhimento e responsabilidades.', legalReferences: ['NR-1', 'NR-5'], recommendedModality: 'E_LEARNING', requiresPractical: false, riskTags: ['PSYCHOSOCIAL', 'HARASSMENT'], notes: ['Não transformar o curso em avaliação clínica ou individual.'] },
  { code: 'ERGONOMICS', title: 'Ergonomia e organização do trabalho', description: 'Orientações sobre tarefas, postos, pausas, ajustes, variações e sinais de inadequação.', legalReferences: ['NR-17'], recommendedModality: 'BLENDED', requiresPractical: true, riskTags: ['ERGONOMIC'], notes: ['Incluir demonstração no posto quando aplicável.'] },
  { code: 'DDS_MICROTRAINING', title: 'DDS e microtreinamento', description: 'Conteúdo curto, rastreável e contextualizado para riscos e ocorrências da empresa.', legalReferences: ['procedimentos internos'], recommendedModality: 'E_LEARNING', requiresPractical: false, riskTags: ['DDS'], notes: ['Não substitui treinamento regulamentar quando este for exigido.'] },
  { code: 'CUSTOM', title: 'Treinamento personalizado', description: 'Curso configurável por cliente, atividade, procedimento, risco ou equipamento.', legalReferences: [], recommendedModality: 'BLENDED', requiresPractical: false, riskTags: [], notes: ['Aprovação do projeto pedagógico e dos requisitos deve ser registrada.'] },
];

export function trainingTemplate(code: string): TrainingTemplate | undefined {
  return trainingTemplateCatalog.find((item) => item.code === code.trim().toUpperCase());
}

const recommendationMap: Record<string, string[]> = {
  ELECTRICAL: ['NR10_ELECTRICAL'],
  MACHINERY: ['NR12_MACHINERY'],
  HEIGHT: ['NR35_HEIGHT'],
  CONFINED_SPACE: ['NR33_CONFINED_SPACE'],
  FLAMMABLE: ['NR20_FLAMMABLES'],
  FUEL: ['NR20_FLAMMABLES'],
  FIRE: ['NR23_FIRE'],
  EMERGENCY: ['NR23_FIRE'],
  BIOLOGICAL: ['NR32_HEALTHCARE', 'NR06_EPI'],
  SHARPS: ['NR32_HEALTHCARE'],
  ERGONOMIC: ['ERGONOMICS'],
  PSYCHOSOCIAL: ['PSYCHOSOCIAL_PREVENTION'],
  HARASSMENT: ['PSYCHOSOCIAL_PREVENTION'],
  FORKLIFT: ['NR11_MATERIAL_HANDLING'],
  MATERIAL_HANDLING: ['NR11_MATERIAL_HANDLING'],
  CONSTRUCTION: ['NR18_CONSTRUCTION'],
  PPE: ['NR06_EPI'],
};

export function recommendTrainingTemplates(tags: string[]): TrainingTemplate[] {
  const codes = new Set<string>(['SST_INTEGRATION']);
  for (const tag of tags.map((value) => value.trim().toUpperCase())) for (const code of recommendationMap[tag] ?? []) codes.add(code);
  return [...codes].map((code) => trainingTemplate(code)).filter((item): item is TrainingTemplate => Boolean(item));
}
