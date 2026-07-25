export type WorkflowRequirementDefinition = {
  code: string;
  title: string;
  description?: string;
  required?: boolean;
};

export type WorkflowStepDefinition = {
  code: string;
  title: string;
  description?: string;
  required?: boolean;
  requirements: WorkflowRequirementDefinition[];
};

export type WorkflowDefinition = {
  code: string;
  name: string;
  serviceType: string;
  version: number;
  description: string;
  steps: WorkflowStepDefinition[];
};

const requirement = (code: string, title: string, description?: string): WorkflowRequirementDefinition => ({
  code,
  title,
  description,
  required: true,
});

const commonIdentification: WorkflowStepDefinition = {
  code: 'identification',
  title: 'Identificação e escopo',
  requirements: [
    requirement('company_registration', 'Dados cadastrais da empresa'),
    requirement('establishment', 'Unidade ou estabelecimento avaliado'),
    requirement('technical_scope', 'Escopo e objetivo do trabalho'),
    requirement('technical_responsible', 'Responsável técnico definido'),
  ],
};

const commonStructure: WorkflowStepDefinition = {
  code: 'organization',
  title: 'Estrutura organizacional',
  requirements: [
    requirement('sectors', 'Setores cadastrados'),
    requirement('functions', 'Funções e atividades cadastradas'),
    requirement('ghes', 'GHEs ou grupos de exposição definidos'),
    requirement('population', 'População e jornadas caracterizadas'),
  ],
};

const commonEvidence: WorkflowStepDefinition = {
  code: 'field_evidence',
  title: 'Levantamento e evidências',
  requirements: [
    requirement('field_records', 'Registros de campo'),
    requirement('photos', 'Fotografias e anexos identificados'),
    requirement('interviews', 'Entrevistas ou informações dos trabalhadores'),
  ],
};

const commonActionPlan: WorkflowStepDefinition = {
  code: 'action_plan',
  title: 'Plano de ação',
  requirements: [
    requirement('recommendations', 'Recomendações técnicas'),
    requirement('owners_deadlines', 'Responsáveis, prioridades e prazos'),
    requirement('effectiveness', 'Critérios de acompanhamento e eficácia'),
  ],
};

const commonDocument: WorkflowStepDefinition = {
  code: 'document',
  title: 'Documento e aprovação',
  requirements: [
    requirement('draft', 'Minuta gerada'),
    requirement('technical_audit', 'Auditoria de completude executada'),
    requirement('professional_review', 'Revisão profissional concluída'),
    requirement('final_approval', 'Liberação final aprovada'),
  ],
};

export const defaultWorkflowDefinitions: Record<string, WorkflowDefinition> = {
  AET: {
    code: 'AET_DEFAULT',
    name: 'AEP e Análise Ergonômica do Trabalho',
    serviceType: 'AET',
    version: 2,
    description: 'Fluxo integrado de avaliação ergonômica preliminar e AET, com análise da atividade, participação, métodos, plano de ação e auditoria.',
    steps: [
      commonIdentification,
      commonStructure,
      {
        code: 'ergonomic_demand',
        title: 'Demanda e avaliação preliminar',
        requirements: [
          requirement('demand', 'Demanda, origem e motivação registradas'),
          requirement('aep_scope', 'Escopo da avaliação ergonômica preliminar definido'),
          requirement('worker_complaints', 'Queixas, sinais e solicitações considerados'),
          requirement('aep_decision', 'Decisão da AEP registrada e justificada'),
        ],
      },
      {
        code: 'activity_analysis',
        title: 'Situações de trabalho e análise da atividade',
        requirements: [
          requirement('work_situations', 'Situações de trabalho representativas cadastradas'),
          requirement('prescribed_real_work', 'Trabalho prescrito e trabalho real comparados'),
          requirement('variability_strategies', 'Variabilidades, estratégias e regulações registradas'),
          requirement('population_journey', 'População, jornada, pausas e duração caracterizadas'),
        ],
      },
      {
        code: 'worker_participation',
        title: 'Participação dos trabalhadores',
        requirements: [
          requirement('worker_participation_records', 'Entrevistas, observações ou consultas registradas'),
          requirement('collective_feedback', 'Resultados e devolutivas coletivas documentados'),
          requirement('privacy', 'Privacidade e confidencialidade protegidas'),
        ],
      },
      commonEvidence,
      {
        code: 'ergonomic_dimensions',
        title: 'Dimensões e condições de trabalho',
        requirements: [
          requirement('work_organization', 'Organização do trabalho analisada'),
          requirement('physical_demands', 'Exigências físicas e biomecânicas analisadas'),
          requirement('cognitive', 'Exigências cognitivas e tomada de decisão analisadas'),
          requirement('psychosocial', 'Fatores psicossociais relacionados ao trabalho analisados'),
          requirement('environmental_conditions', 'Conforto e condições ambientais relacionados à atividade analisados'),
          requirement('accessibility', 'Acessibilidade e adaptações consideradas quando aplicáveis'),
        ],
      },
      {
        code: 'ergonomic_methods',
        title: 'Métodos e avaliações específicas',
        requirements: [
          requirement('method_selection', 'Métodos selecionados com aplicabilidade justificada'),
          requirement('biomechanics', 'RULA, REBA, NIOSH ou métodos aplicáveis registrados'),
          requirement('deterministic_calculations', 'Cálculos determinísticos preservados'),
          requirement('method_professional_review', 'Resultados revisados por profissional'),
          requirement('method_limitations', 'Limitações metodológicas registradas'),
        ],
      },
      {
        code: 'ergonomic_diagnosis',
        title: 'Diagnóstico ergonômico',
        requirements: [
          requirement('results', 'Resultados e achados consolidados'),
          requirement('technical_diagnosis', 'Diagnóstico técnico por situação de trabalho'),
          requirement('risk_integration', 'Achados integrados ao inventário de riscos quando aplicável'),
          requirement('limitations', 'Limitações e ressalvas gerais registradas'),
        ],
      },
      commonActionPlan,
      commonDocument,
    ],
  },
  PGR: {
    code: 'PGR_DEFAULT',
    name: 'Programa de Gerenciamento de Riscos',
    serviceType: 'PGR',
    version: 2,
    description: 'Fluxo GRO/PGR contínuo com levantamento preliminar, inventário, participação, fatores psicossociais, plano de ação e auditoria.',
    steps: [
      commonIdentification,
      commonStructure,
      {
        code: 'preliminary_hazard_survey',
        title: 'Levantamento preliminar de perigos',
        requirements: [
          requirement('processes', 'Processos, ambientes e atividades caracterizados'),
          requirement('changes', 'Mudanças, novos processos e situações especiais verificadas'),
          requirement('avoidable_hazards', 'Perigos evitáveis eliminados ou justificados'),
          requirement('shared_workplaces', 'Riscos compartilhados com outras organizações avaliados'),
        ],
      },
      {
        code: 'hazard_identification',
        title: 'Identificação de perigos e grupos expostos',
        requirements: [
          requirement('hazards', 'Perigos, fontes e circunstâncias identificados'),
          requirement('harms', 'Possíveis lesões ou agravos registrados'),
          requirement('exposed_groups', 'GHEs, funções e trabalhadores expostos identificados'),
          requirement('existing_controls', 'Medidas de prevenção existentes registradas'),
          requirement('monitoring_data', 'Avaliações ambientais e ergonômicas aplicáveis vinculadas'),
        ],
      },
      {
        code: 'risk_assessment',
        title: 'Avaliação e classificação de riscos',
        requirements: [
          requirement('risk_criteria', 'Critérios de avaliação e tomada de decisão definidos'),
          requirement('initial_risk', 'Risco inicial avaliado'),
          requirement('residual_risk', 'Risco residual avaliado após controles'),
          requirement('priority', 'Prioridades de tratamento estabelecidas'),
        ],
      },
      {
        code: 'worker_participation',
        title: 'Participação e comunicação',
        requirements: [
          requirement('worker_participation_records', 'Participação ativa dos trabalhadores registrada'),
          requirement('cipa_consultation', 'CIPA ou representação consultada quando aplicável'),
          requirement('risk_communication', 'Riscos consolidados e medidas comunicados aos trabalhadores'),
        ],
      },
      {
        code: 'psychosocial_management',
        title: 'Fatores psicossociais relacionados ao trabalho',
        requirements: [
          requirement('psychosocial_screening', 'Organização e gestão do trabalho analisadas'),
          requirement('psychosocial_participation', 'Trabalhadores participaram da avaliação coletiva'),
          requirement('psychosocial_privacy', 'Anonimato e grupos mínimos protegidos'),
          requirement('psychosocial_actions', 'Medidas organizacionais planejadas quando necessárias'),
        ],
      },
      commonActionPlan,
      {
        code: 'monitoring_review',
        title: 'Acompanhamento e revisão',
        requirements: [
          requirement('action_tracking', 'Execução do plano de ação acompanhada'),
          requirement('effectiveness_review', 'Eficácia das medidas verificada'),
          requirement('review_triggers', 'Gatilhos de revisão e próxima revisão definidos'),
          requirement('history_retention', 'Histórico das atualizações preservado'),
        ],
      },
      commonDocument,
    ],
  },
  PCMSO: {
    code: 'PCMSO_DEFAULT',
    name: 'PCMSO e Gestão de Saúde Ocupacional',
    serviceType: 'PCMSO',
    version: 2,
    description: 'Fluxo integrado com PGR, cadastro ocupacional, matriz de exames, convocações, ASO, relatório analítico e preparação do S-2220.',
    steps: [
      commonIdentification,
      commonStructure,
      {
        code: 'worker_population',
        title: 'População e vínculos ocupacionais',
        requirements: [
          requirement('worker_roster', 'Trabalhadores identificados por vínculo ou matrícula'),
          requirement('active_worker_population', 'População ativa e movimentações caracterizadas'),
          requirement('assignment_history', 'GHE, função e períodos ocupacionais vinculados'),
          requirement('medical_privacy', 'Acesso médico restrito e rastreado'),
        ],
      },
      {
        code: 'risk_mapping',
        title: 'Integração com riscos ocupacionais',
        requirements: [
          requirement('pgr_reference', 'PGR ou inventário de riscos vinculado'),
          requirement('risks_by_function', 'Riscos relacionados por função e GHE'),
          requirement('special_populations', 'Grupos especiais ou condições específicas avaliados pelo médico'),
        ],
      },
      {
        code: 'medical_plan',
        title: 'Planejamento médico',
        requirements: [
          requirement('responsible_physician', 'Médico responsável pelo PCMSO definido'),
          requirement('exam_matrix', 'Matriz de avaliações clínicas e exames definida'),
          requirement('periodicities', 'Periodicidades e gatilhos configurados'),
          requirement('clinical_protocols', 'Protocolos e critérios médicos registrados'),
        ],
      },
      {
        code: 'health_monitoring',
        title: 'Monitoramento da saúde ocupacional',
        requirements: [
          requirement('callup_schedule', 'Convocações e vencimentos organizados'),
          requirement('health_monitoring', 'Avaliações ocupacionais realizadas'),
          requirement('aso_tracking', 'ASOs emitidos e versionados'),
          requirement('confidential_records', 'Resultados clínicos protegidos da área geral'),
        ],
      },
      {
        code: 'analytical_report',
        title: 'Relatório analítico',
        requirements: [
          requirement('aggregated_indicators', 'Indicadores agregados disponíveis'),
          requirement('analysis', 'Análise dos resultados coletivos'),
          requirement('recommendations', 'Recomendações para o gerenciamento de riscos'),
          requirement('medical_review', 'Revisão e aprovação médica concluídas'),
        ],
      },
      {
        code: 'esocial_monitoring',
        title: 'Preparação para o eSocial',
        requirements: [
          requirement('s2220_preparation', 'Rascunhos S-2220 validados'),
          requirement('esocial_versioning', 'Versão do leiaute e regras registradas'),
          requirement('transmission_approval', 'Transmissão depende de aprovação e integração homologada'),
        ],
      },
      commonDocument,
    ],
  },
  LTCAT: {
    code: 'LTCAT_DEFAULT',
    name: 'LTCAT, PPP e Condições Ambientais',
    serviceType: 'LTCAT',
    version: 2,
    description: 'Fluxo previdenciário com histórico temporal de exposições, avaliações, controles, conclusões, PPP e preparação do S-2240.',
    steps: [
      commonIdentification,
      commonStructure,
      {
        code: 'professional_scope',
        title: 'Responsabilidade e escopo previdenciário',
        requirements: [
          requirement('scope', 'Escopo, finalidade e data de referência definidos'),
          requirement('responsible_technical', 'Profissional legalmente habilitado definido'),
          requirement('legal_framework', 'Critérios previdenciários e referências versionadas'),
          requirement('source_documents', 'PGR, avaliações e documentos de origem vinculados'),
        ],
      },
      {
        code: 'occupational_history',
        title: 'Histórico ocupacional e períodos',
        requirements: [
          requirement('assignment_history', 'Funções, GHEs e estabelecimentos históricos vinculados'),
          requirement('exposure_periods', 'Períodos de exposição sem sobreposição indevida'),
          requirement('activities', 'Atividades reais descritas por período'),
          requirement('environment_identification', 'Ambientes e setores identificados'),
        ],
      },
      commonEvidence,
      {
        code: 'exposure_assessment',
        title: 'Avaliação das exposições',
        requirements: [
          requirement('harmful_agents', 'Agentes nocivos caracterizados e codificados'),
          requirement('measurements', 'Avaliações qualitativas ou quantitativas válidas'),
          requirement('calibration', 'Equipamentos, certificados e validade de calibração'),
          requirement('epc_epi', 'EPC, EPI, documentos e eficácia analisados'),
          requirement('exposure_pattern', 'Frequência, duração e padrão de exposição registrados'),
        ],
      },
      {
        code: 'social_security_conclusion',
        title: 'Conclusão previdenciária',
        requirements: [
          requirement('conclusion_by_ghe', 'Conclusão aprovada por período, GHE ou função'),
          requirement('special_period', 'Tempo especial de 15, 20 ou 25 anos registrado quando aplicável'),
          requirement('professional_approval', 'Aprovação do profissional habilitado'),
        ],
      },
      {
        code: 'ppp_esocial',
        title: 'PPP eletrônico e eSocial',
        requirements: [
          requirement('ppp_esocial_data', 'Dados de PPP e S-2240 preparados e validados'),
          requirement('ppp_review', 'Rascunho do PPP revisado'),
          requirement('s2240_versioning', 'Leiaute S-2240 e regras versionados'),
          requirement('transmission_approval', 'Transmissão depende de integração homologada e aprovação'),
        ],
      },
      commonDocument,
    ],
  },
  INSALUBRIDADE: {
    code: 'LI_DEFAULT',
    name: 'Laudo de Insalubridade',
    serviceType: 'INSALUBRIDADE',
    version: 2,
    description: 'Fluxo trabalhista com períodos, agentes, avaliações da NR-15, controles, neutralização e conclusão profissional.',
    steps: [commonIdentification, commonStructure, {
      code: 'professional_scope',
      title: 'Responsabilidade e escopo',
      requirements: [
        requirement('scope', 'Escopo e trabalhadores abrangidos definidos'),
        requirement('responsible_technical', 'Médico do trabalho ou engenheiro do trabalho habilitado'),
        requirement('exposure_periods', 'Períodos, atividades e grupos avaliados'),
      ],
    }, commonEvidence, {
      code: 'agent_assessment',
      title: 'Avaliação dos agentes e controles',
      requirements: [
        requirement('agents', 'Agentes e fontes caracterizados'),
        requirement('applicable_annexes', 'Anexos e critérios da NR-15 registrados'),
        requirement('qualitative_quantitative', 'Método qualitativo ou quantitativo justificado'),
        requirement('measurements', 'Medições e calibrações válidas quando aplicáveis'),
        requirement('controls', 'Medidas de controle, EPC, EPI e neutralização avaliados'),
      ],
    }, {
      code: 'technical_conclusion',
      title: 'Conclusão de insalubridade',
      requirements: [
        requirement('conclusion_by_function', 'Conclusão e grau por função, GHE ou período'),
        requirement('professional_approval', 'Conclusão aprovada por profissional habilitado'),
        requirement('technical_rationale', 'Fundamentação e ressalvas registradas'),
      ],
    }, commonDocument],
  },
  PERICULOSIDADE: {
    code: 'LP_DEFAULT',
    name: 'Laudo de Periculosidade',
    serviceType: 'PERICULOSIDADE',
    version: 2,
    description: 'Fluxo para atividades perigosas, áreas de risco, padrão de exposição e conclusão profissional conforme a NR-16.',
    steps: [commonIdentification, commonStructure, {
      code: 'professional_scope',
      title: 'Responsabilidade e escopo',
      requirements: [
        requirement('scope', 'Escopo, atividades e trabalhadores abrangidos'),
        requirement('responsible_technical', 'Médico do trabalho ou engenheiro do trabalho habilitado'),
        requirement('exposure_periods', 'Períodos e grupos avaliados'),
      ],
    }, commonEvidence, {
      code: 'dangerous_activity',
      title: 'Caracterização da periculosidade',
      requirements: [
        requirement('applicable_activity', 'Atividade ou operação enquadrável identificada'),
        requirement('risk_area', 'Área de risco delimitada e evidenciada'),
        requirement('exposure_pattern', 'Habitualidade, intermitência, eventualidade e permanência avaliadas'),
        requirement('controls', 'Controles e condições operacionais registrados'),
      ],
    }, {
      code: 'technical_conclusion',
      title: 'Conclusão de periculosidade',
      requirements: [
        requirement('technical_conclusion', 'Conclusão por função, GHE ou período'),
        requirement('professional_approval', 'Conclusão aprovada por profissional habilitado'),
        requirement('technical_rationale', 'Fundamentação e ressalvas registradas'),
      ],
    }, commonDocument],
  },
  HIGIENE_OCUPACIONAL: {
    code: 'HO_DEFAULT',
    name: 'Higiene Ocupacional e Avaliações Ambientais',
    serviceType: 'HIGIENE_OCUPACIONAL',
    version: 2,
    description: 'Fluxo rastreável de reconhecimento, estratégia, amostragem, instrumentos, calibrações, memória de cálculo, interpretação e integração documental.',
    steps: [commonIdentification, commonStructure, {
      code: 'recognition',
      title: 'Reconhecimento e definição do escopo',
      requirements: [
        requirement('agent_objective', 'Agente, finalidade e objetivo da avaliação'),
        requirement('representative_groups', 'GHEs, funções, tarefas e trabalhadores representativos definidos'),
        requirement('exposure_scenarios', 'Cenários, fontes, vias e padrões de exposição caracterizados'),
        requirement('method_limitations', 'Premissas e limitações registradas'),
      ],
    }, {
      code: 'sampling_strategy',
      title: 'Estratégia e plano de amostragem',
      requirements: [
        requirement('sampling_strategy', 'Estratégia pessoal, área, tarefa ou leitura direta definida'),
        requirement('minimum_samples', 'Quantidade e representatividade planejadas'),
        requirement('methodology_version', 'Método, referência e edição normativa definidos'),
        requirement('field_checklist', 'Checklist e condições de campo preparados'),
      ],
    }, {
      code: 'instruments',
      title: 'Instrumentos e rastreabilidade metrológica',
      requirements: [
        requirement('equipment_calibration', 'Instrumentos e calibrações válidas vinculados'),
        requirement('field_calibration', 'Verificações de campo antes e após registradas'),
        requirement('instrument_history', 'Reserva, uso, devolução e manutenção rastreados'),
      ],
    }, commonEvidence, {
      code: 'results',
      title: 'Resultados e memória de cálculo',
      requirements: [
        requirement('raw_data', 'Dados brutos e condições ambientais preservados'),
        requirement('calculation_memory', 'Memória de cálculo e versão do motor preservadas'),
        requirement('limits_comparison', 'Comparação com níveis de ação e critérios aplicáveis'),
        requirement('uncertainty', 'Incerteza e limitações consideradas quando aplicáveis'),
        requirement('result_professional_review', 'Resultados revisados por profissional habilitado'),
      ],
    }, {
      code: 'integration',
      title: 'Integração e interpretação técnica',
      requirements: [
        requirement('exposure_integration', 'Resultados vinculados aos agentes e períodos de exposição'),
        requirement('pgr_integration', 'Resultados disponibilizados ao PGR e plano de ação'),
        requirement('ltcat_integration', 'Resultados preparados para LTCAT, PPP, S-2240 e laudos quando aplicável'),
        requirement('technical_interpretation', 'Interpretação técnica e ressalvas registradas'),
      ],
    }, commonActionPlan, commonDocument],
  },
  TREINAMENTO: {
    code: 'TRAINING_DEFAULT',
    name: 'Universidade Corporativa, Treinamentos e Competências',
    serviceType: 'TREINAMENTO',
    version: 2,
    description: 'Fluxo completo para cursos presenciais, ao vivo, semipresenciais e virtuais, avaliações, prática, certificados, trilhas e competências.',
    steps: [commonIdentification, {
      code: 'pedagogical_project',
      title: 'Projeto pedagógico e governança',
      requirements: [
        requirement('audience', 'Público-alvo, pré-requisitos e acessibilidade'),
        requirement('content', 'Objetivos, conteúdo programático e materiais'),
        requirement('workload', 'Carga horária, modalidade e parte prática'),
        requirement('instructor', 'Instrutor e responsável técnico'),
        requirement('records_retention', 'Registros, evidências e prazo de retenção definidos'),
      ],
    }, {
      code: 'course_catalog',
      title: 'Cursos, trilhas e requisitos',
      requirements: [
        requirement('course_catalog', 'Cursos versionados e publicados'),
        requirement('learning_paths', 'Trilhas por função, GHE ou atividade configuradas'),
        requirement('risk_training_rules', 'Regras derivadas de riscos, exposições e equipamentos'),
        requirement('competency_matrix', 'Competências e autorizações vinculadas'),
      ],
    }, {
      code: 'delivery',
      title: 'Realização e rastreabilidade',
      requirements: [
        requirement('learning_materials', 'Aulas e materiais disponibilizados'),
        requirement('attendance', 'Matrículas, presença e logs de acesso'),
        requirement('access_time', 'Tempo ativo e conclusão das aulas registrados'),
        requirement('live_sessions', 'Sessões presenciais ou ao vivo registradas quando aplicável'),
        requirement('practical_part', 'Parte prática e evidências registradas quando aplicável'),
      ],
    }, {
      code: 'assessment',
      title: 'Avaliações e aprendizagem',
      requirements: [
        requirement('assessment', 'Banco de questões e avaliações configurados'),
        requirement('passing_criteria', 'Nota mínima, tentativas e revisão manual definidas'),
        requirement('practical_assessment', 'Avaliação prática aprovada quando exigida'),
        requirement('learning_results', 'Resultados e feedback preservados'),
      ],
    }, {
      code: 'certification',
      title: 'Certificação, validade e competências',
      requirements: [
        requirement('certificate', 'Certificado verificável e QR Code'),
        requirement('certificate_validity', 'Validade, reciclagem e revogação controladas'),
        requirement('competency_update', 'Matriz de competências atualizada'),
        requirement('renewal_alerts', 'Alertas de vencimento e reciclagem'),
      ],
    }, commonDocument],
  },

  OPERACAO_SST: {
    code: 'OPERATIONAL_SST_DEFAULT',
    name: 'Operação SST 360',
    serviceType: 'OPERACAO_SST',
    version: 1,
    description: 'Gestão integrada de EPI/EPC, acidentes, permissões, máquinas, químicos, emergências, CIPA, contratadas, requisitos legais, portais e eSocial.',
    steps: [commonIdentification, commonStructure, {
      code: 'operational_governance',
      title: 'Governança e conformidade operacional',
      requirements: [
        requirement('operational_scope', 'Escopo operacional definido'),
        requirement('operational_responsible', 'Responsável pelo programa definido'),
        requirement('legal_matrix', 'Matriz de requisitos legais e operacionais'),
        requirement('operational_calendar', 'Calendário de vencimentos e revisões'),
      ],
    }, {
      code: 'ppe_epc',
      title: 'EPI, EPC e competências',
      requirements: [
        requirement('ppe_catalog', 'Catálogo de EPI e CA controlados'),
        requirement('ppe_delivery', 'Entregas, trocas, devoluções e evidências'),
        requirement('epc_controls', 'EPC, inspeções e eficácia registrados'),
        requirement('competency_integration', 'Treinamentos e competências integrados'),
      ],
    }, {
      code: 'incidents',
      title: 'Acidentes, incidentes e investigação',
      requirements: [
        requirement('incident_records', 'Acidentes, doenças, incidentes e quase acidentes registrados'),
        requirement('incident_investigation', 'Investigação, causas e barreiras registradas'),
        requirement('cat_control', 'CAT e comunicação obrigatória controladas'),
        requirement('incident_actions', 'Ações corretivas e verificação de eficácia'),
      ],
    }, {
      code: 'critical_activities',
      title: 'Atividades críticas e permissões',
      requirements: [
        requirement('work_permits', 'Permissões de trabalho controladas'),
        requirement('risk_assessments', 'APR e checklists vinculados'),
        requirement('lockout_control', 'Bloqueio e etiquetagem quando aplicável'),
        requirement('critical_authorizations', 'Autorizações e equipes habilitadas'),
      ],
    }, {
      code: 'assets_chemicals',
      title: 'Máquinas, instalações e produtos químicos',
      requirements: [
        requirement('machine_inventory', 'Inventário de máquinas e inspeções'),
        requirement('machine_safeguards', 'Proteções, dispositivos e manutenção'),
        requirement('chemical_inventory', 'Inventário químico e FDS'),
        requirement('chemical_controls', 'Armazenamento, incompatibilidades e emergência'),
      ],
    }, {
      code: 'emergency_cipa',
      title: 'Emergências, CIPA e prevenção',
      requirements: [
        requirement('emergency_plan', 'Plano de emergência aprovado'),
        requirement('emergency_drills', 'Simulados e melhorias registrados'),
        requirement('cipa_cycle', 'Ciclo da CIPA e reuniões controlados'),
        requirement('harassment_prevention', 'Ações de prevenção ao assédio e violência'),
      ],
    }, {
      code: 'contractors_portal',
      title: 'Contratadas, clientes e colaboração',
      requirements: [
        requirement('contractor_control', 'Contratadas, documentos e riscos compartilhados'),
        requirement('access_clearance', 'Liberação de acesso e vencimentos'),
        requirement('client_portal', 'Portal do cliente e solicitações'),
        requirement('worker_portal', 'Portal do trabalhador e comunicações'),
      ],
    }, {
      code: 'integrations',
      title: 'Integrações e eSocial',
      requirements: [
        requirement('esocial_queue', 'Fila versionada dos eventos S-2210, S-2220 e S-2240'),
        requirement('integration_monitoring', 'Protocolos, rejeições e retentativas controlados'),
        requirement('data_export', 'Exportação e portabilidade de dados'),
      ],
    }, commonActionPlan, {
      code: 'operational_assurance',
      title: 'Auditoria e melhoria contínua',
      requirements: [
        requirement('operational_audit', 'Auditoria operacional executada'),
        requirement('management_review', 'Análise crítica da gestão registrada'),
        requirement('indicators', 'Indicadores e tendências acompanhados'),
        requirement('continuous_improvement', 'Melhorias e eficácia verificadas'),
      ],
    }, commonDocument],
  },


};

export const supportedServiceTypes = Object.keys(defaultWorkflowDefinitions);

export function workflowDefinitionFor(serviceType: string): WorkflowDefinition {
  const key = serviceType.trim().toUpperCase();
  const definition = defaultWorkflowDefinitions[key];
  if (!definition) throw new Error(`Tipo de trabalho não suportado: ${serviceType}`);
  return definition;
}
