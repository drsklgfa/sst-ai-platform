export type DefaultSection = { code: string; title: string; html: string };

const common: DefaultSection[] = [
  { code: 'IDENTIFICATION', title: 'Identificação da organização', html: '<p>Caracterize a empresa, estabelecimento, setores e grupos avaliados.</p>' },
  { code: 'OBJECTIVE', title: 'Objetivos', html: '<p>Descreva o objetivo, o escopo e os limites desta avaliação.</p>' },
  { code: 'LEGAL', title: 'Referências legais e técnicas', html: '<p>Registre as normas, referências metodológicas e critérios considerados.</p>' },
  { code: 'METHOD', title: 'Metodologia', html: '<p>Descreva as etapas, fontes de dados, instrumentos e critérios de avaliação.</p>' },
  { code: 'CHARACTERIZATION', title: 'Caracterização das atividades', html: '<p>Descreva processos, organização do trabalho, tarefas e grupos expostos.</p>' },
  { code: 'RESULTS', title: 'Resultados e análise técnica', html: '<p>Apresente resultados, evidências, cálculos, medições e interpretação profissional.</p>' },
  { code: 'RISKS', title: 'Classificação dos riscos', html: '<p>Apresente a matriz, critérios, riscos iniciais e residuais.</p>' },
  { code: 'ACTION_PLAN', title: 'Plano de ação', html: '<p>Relacione medidas, responsáveis, prazos, métodos, custos e prioridades.</p>' },
  { code: 'CONCLUSION', title: 'Conclusão técnica', html: '<p>Registre a conclusão do responsável técnico e as ressalvas aplicáveis.</p>' },
  { code: 'SIGNATURES', title: 'Responsáveis e assinaturas', html: '<p>Insira responsáveis, registros profissionais, ART e método de assinatura quando aplicável.</p>' },
  { code: 'ANNEXES', title: 'Anexos', html: '<p>Relacione fotos, certificados, memórias de cálculo, planilhas e evidências.</p>' }
];

const overrides: Record<string, DefaultSection[]> = {
  AEP: [
    { code: 'PARTICIPATION', title: 'Participação dos trabalhadores', html: '<p>Apresente a forma de participação, adesão e resultados consolidados.</p>' },
    { code: 'BODY_MAP', title: 'Mapa de desconfortos corporais', html: '<p>Apresente as regiões indicadas e respectivas intensidades consolidadas.</p>' }
  ],
  AET: [
    { code: 'DEMAND', title: 'Demanda e avaliação ergonômica preliminar', html: '<p>Descreva a origem, os determinantes, as queixas, os sinais e a decisão fundamentada da AEP.</p>' },
    { code: 'WORK_SITUATIONS', title: 'Situações de trabalho avaliadas', html: '<p>Caracterize estabelecimento, setor, GHE, função, posto, população, jornada, pausas e representatividade.</p>' },
    { code: 'ACTIVITY_ANALYSIS', title: 'Análise da atividade real', html: '<p>Compare trabalho prescrito e real, variabilidades, estratégias, regulações, restrições e modos operatórios.</p>' },
    { code: 'WORKER_PARTICIPATION', title: 'Participação dos trabalhadores', html: '<p>Registre entrevistas, observações, consultas, grupos, resultados coletivos, devolutivas e proteção da confidencialidade.</p>' },
    { code: 'WORK_ORGANIZATION', title: 'Organização do trabalho', html: '<p>Analise normas de produção, ritmo, exigências de tempo, conteúdo das tarefas, supervisão, meios técnicos e pausas.</p>' },
    { code: 'ERGONOMIC_DIMENSIONS', title: 'Dimensões física, cognitiva, psicossocial e ambiental', html: '<p>Apresente exigências biomecânicas, cognitivas, organizacionais, psicossociais, ambientais e de acessibilidade.</p>' },
    { code: 'ERGONOMIC_TOOLS', title: 'Métodos e avaliações específicas', html: '<p>Apresente aplicabilidade, entradas, resultados, motores determinísticos, revisão profissional e limitações dos métodos.</p>' },
    { code: 'ERGONOMIC_DIAGNOSIS', title: 'Diagnóstico ergonômico', html: '<p>Consolide achados por situação de trabalho, níveis de risco, evidências, integração com o PGR e ressalvas.</p>' },
    { code: 'AEP_DECISION', title: 'Decisão da AEP e necessidade de AET', html: '<p>Registre a conclusão da avaliação preliminar, a necessidade de aprofundamento e a aprovação do responsável.</p>' }
  ],
  PSY: [
    { code: 'ANONYMITY', title: 'Critérios de anonimato e consolidação', html: '<p>Registre limites mínimos, supressão de grupos pequenos e proteção contra identificação.</p>' },
    { code: 'DIMENSIONS', title: 'Dimensões psicossociais', html: '<p>Apresente carga mental, ritmo, autonomia, apoio, papéis, reconhecimento e equilíbrio vida-trabalho.</p>' }
  ],
  PGR: [
    { code: 'SCOPE_CRITERIA', title: 'Escopo e critérios do GRO', html: '<p>Descreva abrangência, responsabilidades, critérios de avaliação e tomada de decisão.</p>' },
    { code: 'PRELIMINARY_SURVEY', title: 'Levantamento preliminar de perigos', html: '<p>Caracterize processos, ambientes, atividades, mudanças e situações de trabalho compartilhado.</p>' },
    { code: 'INVENTORY', title: 'Inventário de riscos ocupacionais', html: '<p>Caracterize perigos, fontes, possíveis agravos, grupos expostos, controles, monitoramento, avaliação inicial e residual.</p>' },
    { code: 'WORKER_PARTICIPATION', title: 'Participação e comunicação dos trabalhadores', html: '<p>Registre consultas, CIPA, entrevistas, oficinas, devolutivas e comunicação dos riscos e medidas.</p>' },
    { code: 'PSYCHOSOCIAL', title: 'Fatores psicossociais relacionados ao trabalho', html: '<p>Apresente análise coletiva da organização e gestão do trabalho, anonimato, limitações e medidas organizacionais.</p>' },
    { code: 'ACTION_PLAN', title: 'Plano de ação', html: '<p>Relacione medidas, prioridades, responsáveis, prazos, acompanhamento e verificação da eficácia.</p>' },
    { code: 'GRO', title: 'Gerenciamento contínuo e revisão', html: '<p>Descreva gatilhos de revisão, atualização contínua, preservação histórica e acompanhamento.</p>' }
  ],
  PCMSO: [
    { code: 'RISK_INTEGRATION', title: 'Integração com o gerenciamento de riscos', html: '<p>Apresente os riscos ocupacionais considerados, os grupos abrangidos e a vinculação com o PGR.</p>' },
    { code: 'MEDICAL_PLANNING', title: 'Planejamento do monitoramento da saúde', html: '<p>Apresente o médico responsável, diretrizes, matriz de exames, periodicidades e critérios aplicáveis.</p>' },
    { code: 'EXAM_MATRIX', title: 'Matriz de avaliações clínicas e exames', html: '<p>Relacione exames por GHE, função, risco e tipo de exame ocupacional.</p>' },
    { code: 'HEALTH_MONITORING', title: 'Monitoramento e convocações', html: '<p>Apresente dados gerenciais de convocações e ASOs sem revelar resultados clínicos individuais.</p>' },
    { code: 'ANALYTICAL_REPORT', title: 'Relatório analítico', html: '<p>Apresente indicadores agregados, análise médica, limitações e recomendações ao gerenciamento de riscos.</p>' },
    { code: 'ESOCIAL_S2220', title: 'Preparação do evento S-2220', html: '<p>Registre a versão do leiaute, validações e situação dos eventos de monitoramento da saúde.</p>' },
  ],
  LTCAT: [
    { code: 'OCCUPATIONAL_HISTORY', title: 'Histórico ocupacional e períodos', html: '<p>Apresente estabelecimentos, setores, funções, GHEs, atividades e períodos de exposição preservados historicamente.</p>' },
    { code: 'AGENTS', title: 'Agentes e condições de exposição', html: '<p>Descreva agentes físicos, químicos e biológicos, códigos previdenciários e padrão de exposição por período.</p>' },
    { code: 'MEASUREMENTS', title: 'Avaliações qualitativas e quantitativas', html: '<p>Informe resultados, metodologias, equipamentos, certificados de calibração, laboratórios e incertezas.</p>' },
    { code: 'CONTROLS', title: 'EPC, EPI e eficácia', html: '<p>Registre medidas coletivas, administrativas e individuais, CA, validade, manutenção, treinamento e eficácia comprovada.</p>' },
    { code: 'SOCIAL_SECURITY_CONCLUSION', title: 'Conclusão previdenciária', html: '<p>Apresente a conclusão por período, função ou GHE, o tempo especial aplicável e a aprovação do profissional habilitado.</p>' },
    { code: 'PPP', title: 'Dados para o PPP eletrônico', html: '<p>Apresente os períodos ocupacionais, agentes, avaliações e responsáveis que compõem o rascunho do PPP.</p>' },
    { code: 'ESOCIAL_S2240', title: 'Preparação do evento S-2240', html: '<p>Registre versão do leiaute, validações, ambientes, atividades, agentes nocivos, controles e responsável ambiental.</p>' }
  ],
  INSAL: [
    { code: 'EXPOSURE_PERIODS', title: 'Períodos, funções e atividades avaliadas', html: '<p>Caracterize grupos, períodos, ambientes, tarefas e padrão de exposição.</p>' },
    { code: 'ANNEX_FRAMEWORK', title: 'Enquadramento técnico na NR-15', html: '<p>Analise anexos aplicáveis, metodologia qualitativa ou quantitativa, limites, agentes e fontes.</p>' },
    { code: 'CONTROLS_NEUTRALIZATION', title: 'Controles e neutralização', html: '<p>Avalie EPC, EPI, CA, treinamento, uso, manutenção e evidências de eliminação ou neutralização.</p>' },
    { code: 'INSALUBRITY_CONCLUSION', title: 'Conclusão e grau de insalubridade', html: '<p>Apresente conclusão por função, GHE ou período, grau aplicável, fundamentação e aprovação profissional.</p>' }
  ],
  PERIC: [
    { code: 'DANGEROUS_CONDITIONS', title: 'Caracterização das condições perigosas', html: '<p>Descreva atividades, áreas, operações, anexos aplicáveis e evidências.</p>' },
    { code: 'RISK_AREA', title: 'Delimitação das áreas de risco', html: '<p>Apresente croquis, distâncias, instalações, operações e limites da área avaliada.</p>' },
    { code: 'EXPOSURE_PATTERN', title: 'Padrão de exposição', html: '<p>Avalie habitualidade, intermitência, eventualidade, tempo e permanência nas condições perigosas.</p>' },
    { code: 'DANGEROUS_CONCLUSION', title: 'Conclusão de periculosidade', html: '<p>Apresente conclusão por função, GHE ou período, fundamentação e aprovação profissional.</p>' }
  ],
  HO: [
    { code: 'RECOGNITION', title: 'Reconhecimento dos agentes e cenários', html: '<p>Caracterize fontes, trajetórias, vias de exposição, GHEs, tarefas, jornadas e cenários representativos.</p>' },
    { code: 'SAMPLING_STRATEGY', title: 'Estratégia e plano de amostragem', html: '<p>Apresente objetivo, representatividade, quantidade de amostras, datas, locais, trabalhadores e critérios de aceitação.</p>' },
    { code: 'INSTRUMENTS', title: 'Instrumentos, calibrações e rastreabilidade', html: '<p>Relacione instrumentos, números de série, certificados, validade, verificações de campo, reservas e manutenção.</p>' },
    { code: 'FIELD_DATA', title: 'Dados de campo e condições ambientais', html: '<p>Preserve leituras, horários, duração, condições ambientais, ocorrências, fotos e dados brutos.</p>' },
    { code: 'CALCULATION_MEMORY', title: 'Memória de cálculo', html: '<p>Apresente fórmulas, entradas, resultados intermediários, versão do método, incerteza e limitações.</p>' },
    { code: 'CRITERIA_COMPARISON', title: 'Critérios, níveis de ação e limites', html: '<p>Compare resultados com critérios aplicáveis sem substituir a interpretação do profissional responsável.</p>' },
    { code: 'EXPOSURE_INTEGRATION', title: 'Integração com exposições e documentos SST', html: '<p>Vincule resultados ao PGR, PCMSO, LTCAT, PPP, S-2240, insalubridade e plano de ação quando aplicável.</p>' },
    { code: 'METROLOGY_HISTORY', title: 'Histórico metrológico e gestão dos equipamentos', html: '<p>Apresente calibrações, manutenções, bloqueios, empréstimos, devoluções e disponibilidade dos instrumentos.</p>' }
  ],
  TREINAMENTO: [
    { code: 'PEDAGOGICAL_PROJECT', title: 'Projeto pedagógico', html: '<p>Apresente público-alvo, pré-requisitos, objetivos, conteúdo, metodologia, modalidade, carga horária, acessibilidade, instrutores e critérios de avaliação.</p>' },
    { code: 'COURSE_STRUCTURE', title: 'Estrutura do curso e materiais', html: '<p>Relacione módulos, aulas, materiais, atividades, parte prática e versões publicadas.</p>' },
    { code: 'DELIVERY_EVIDENCE', title: 'Realização, presença e logs de acesso', html: '<p>Apresente matrículas, presença, tempo ativo, conclusão de aulas, sessões ao vivo e evidências de participação.</p>' },
    { code: 'LEARNING_ASSESSMENT', title: 'Avaliação de aprendizagem', html: '<p>Registre questões, tentativas, notas, revisão manual, avaliação prática, feedback e critérios de aprovação.</p>' },
    { code: 'CERTIFICATES', title: 'Certificados e verificação', html: '<p>Apresente certificados emitidos, códigos verificáveis, QR Code, validade, reciclagem, revogações e responsáveis.</p>' },
    { code: 'COMPETENCY_MATRIX', title: 'Matriz de competências e autorizações', html: '<p>Relacione competências exigidas e válidas por trabalhador, função, GHE, risco, equipamento e atividade.</p>' },
  ],
  OPERACAO_SST: [
    { code: 'OPERATIONAL_GOVERNANCE', title: 'Governança e matriz de conformidade', html: '<p>Apresente escopo, responsáveis, matriz legal, calendário, indicadores e critérios de revisão.</p>' },
    { code: 'PPE_EPC', title: 'EPI, EPC e competências', html: '<p>Relacione catálogo, CA, entregas, trocas, estoque, orientações, eficácia, treinamentos e competências.</p>' },
    { code: 'INCIDENT_MANAGEMENT', title: 'Acidentes, incidentes, CAT e investigação', html: '<p>Apresente ocorrências, comunicação, investigação, causas, barreiras, ações e verificação de eficácia.</p>' },
    { code: 'WORK_PERMITS', title: 'Atividades críticas e permissões de trabalho', html: '<p>Registre APR, checklists, equipes, medições, controles, autorizações, validade e encerramento.</p>' },
    { code: 'MACHINES_CHEMICALS', title: 'Máquinas, instalações e produtos químicos', html: '<p>Apresente inventários, inspeções, proteções, manutenção, FDS, armazenamento, incompatibilidades e emergências.</p>' },
    { code: 'EMERGENCY_CIPA', title: 'Emergências, CIPA e prevenção ao assédio', html: '<p>Registre planos, equipes, simulados, ciclos, reuniões, SIPAT e ações preventivas.</p>' },
    { code: 'CONTRACTORS', title: 'Contratadas e riscos compartilhados', html: '<p>Apresente documentação, trabalhadores, integração, liberação, riscos compartilhados e conformidade.</p>' },
    { code: 'ESOCIAL_INTEGRATIONS', title: 'eSocial, portais e integrações', html: '<p>Apresente eventos S-2210, S-2220 e S-2240, estados, protocolos, rejeições, portais e rastreabilidade.</p>' },
    { code: 'OPERATIONAL_AUDIT', title: 'Auditoria operacional e melhoria contínua', html: '<p>Consolide pendências, indicadores, análise crítica, melhorias e eficácia das ações.</p>' },
  ],
  APR: [{ code: 'STEPS', title: 'Etapas da atividade e controles', html: '<p>Divida a atividade em etapas, perigos, riscos, controles e responsáveis.</p>' }],
  OS: [{ code: 'WORKER_GUIDANCE', title: 'Orientações ao trabalhador', html: '<p>Liste riscos, medidas, EPIs, proibições, procedimentos e ciência.</p>' }],
  CUSTOM: []
};

export function getDefaultSections(code: string): DefaultSection[] {
  const specialized = overrides[code] ?? [];
  const specializedCodes = new Set(specialized.map((section) => section.code));
  const base = common.filter((section) => !specializedCodes.has(section.code));
  const insertAt = Math.max(0, base.findIndex((section) => section.code === 'RESULTS'));
  return [...base.slice(0, insertAt), ...specialized, ...base.slice(insertAt)];
}
