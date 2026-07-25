import type { Permission } from '@/lib/rbac';
import type { AIToolDefinition } from '@/lib/integrations/ai';

export type OperationalToolName =
  | 'search_companies'
  | 'get_company_context'
  | 'list_work_projects'
  | 'check_work_project_pending'
  | 'get_pgr_overview'
  | 'run_pgr_audit'
  | 'get_pcmso_overview'
  | 'run_pcmso_audit'
  | 'get_exposure_overview'
  | 'run_exposure_audit'
  | 'get_ergonomics_overview'
  | 'run_ergonomics_audit'
  | 'get_hygiene_overview'
  | 'run_hygiene_audit'
  | 'get_training_overview'
  | 'run_training_audit'
  | 'get_operational_overview'
  | 'run_operational_audit'
  | 'create_work_project'
  | 'create_establishment'
  | 'create_sector'
  | 'create_ghe'
  | 'create_job_function'
  | 'create_workstation'
  | 'create_inspection'
  | 'update_work_requirement';

export type OperationalToolSpec = {
  definition: AIToolDefinition & { name: OperationalToolName };
  permission: Permission;
  mutating: boolean;
  reversible: boolean;
};

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const string = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
const integer = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'integer', description, ...extra });
const array = (description: string, items: Record<string, unknown>) => ({ type: 'array', description, items });

export const operationalToolCatalog: readonly OperationalToolSpec[] = [
  {
    definition: {
      name: 'search_companies',
      description: 'Pesquisa empresas da consultoria por razão social, nome fantasia ou CNPJ. Não altera dados.',
      riskLevel: 'LOW',
      parameters: objectSchema({ query: string('Texto parcial para pesquisa.', { minLength: 2, maxLength: 120 }), limit: integer('Quantidade máxima de resultados.', { minimum: 1, maximum: 20 }) }, ['query']),
    },
    permission: 'company.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'get_company_context',
      description: 'Carrega cadastro e estrutura de uma empresa, incluindo unidades, setores, GHEs, funções e postos.',
      riskLevel: 'LOW',
      parameters: objectSchema({ companyId: string('ID exato da empresa.') }, ['companyId']),
    },
    permission: 'company.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'list_work_projects',
      description: 'Lista trabalhos SST existentes, opcionalmente filtrados por empresa e status.',
      riskLevel: 'LOW',
      parameters: objectSchema({ companyId: string('ID opcional da empresa.'), status: string('Status opcional do trabalho.'), limit: integer('Quantidade máxima.', { minimum: 1, maximum: 30 }) }),
    },
    permission: 'company.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'check_work_project_pending',
      description: 'Verifica progresso, etapas bloqueadas e requisitos pendentes de um Trabalho SST.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho SST.') }, ['workProjectId']),
    },
    permission: 'company.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'get_pgr_overview',
      description: 'Consulta o inventário, participação, avaliação psicossocial, plano de ação e última auditoria de um Trabalho PGR.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho PGR.') }, ['workProjectId']),
    },
    permission: 'company.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_pgr_audit',
      description: 'Executa auditoria determinística de completude do PGR e registra as pendências encontradas.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho PGR.') }, ['workProjectId']),
    },
    permission: 'work.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_pcmso_overview',
      description: 'Consulta trabalhadores ativos, matriz de exames, convocações, ASOs, relatório analítico e última auditoria de um Trabalho PCMSO.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho PCMSO.') }, ['workProjectId']),
    },
    permission: 'medical.program.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_pcmso_audit',
      description: 'Executa auditoria determinística de completude do PCMSO e registra as pendências encontradas sem emitir ASO ou alterar decisão médica.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho PCMSO.') }, ['workProjectId']),
    },
    permission: 'medical.program.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_exposure_overview',
      description: 'Consulta períodos, agentes, medições, controles, conclusões, PPP e S-2240 de um trabalho LTCAT, insalubridade, periculosidade ou higiene ocupacional.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de exposições.') }, ['workProjectId']),
    },
    permission: 'exposure.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_exposure_audit',
      description: 'Executa auditoria determinística de completude das exposições e registra pendências sem aprovar conclusão técnica.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de exposições.') }, ['workProjectId']),
    },
    permission: 'exposure.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_ergonomics_overview',
      description: 'Consulta demandas, situações de trabalho, participação, métodos, achados, decisão da AEP e última auditoria de um trabalho AEP/AET.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho AEP/AET.') }, ['workProjectId']),
    },
    permission: 'ergonomics.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_ergonomics_audit',
      description: 'Executa auditoria determinística de completude da AEP/AET sem aprovar conclusão técnica.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho AEP/AET.') }, ['workProjectId']),
    },
    permission: 'ergonomics.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_hygiene_overview',
      description: 'Consulta planos de amostragem, medições, instrumentos, calibrações e última auditoria de um trabalho de higiene ocupacional.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de higiene ocupacional.') }, ['workProjectId']),
    },
    permission: 'hygiene.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_hygiene_audit',
      description: 'Executa auditoria determinística da higiene ocupacional sem aprovar resultados ou conclusões técnicas.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de higiene ocupacional.') }, ['workProjectId']),
    },
    permission: 'hygiene.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_training_overview',
      description: 'Consulta cursos, trilhas, matrículas, vencimentos, certificados, competências e última auditoria de um trabalho de treinamento.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de treinamento.') }, ['workProjectId']),
    },
    permission: 'training.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_training_audit',
      description: 'Executa auditoria determinística da universidade corporativa sem aprovar avaliações práticas ou emitir certificados.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho de treinamento.') }, ['workProjectId']),
    },
    permission: 'training.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'get_operational_overview',
      description: 'Consulta EPI, ocorrências, permissões, máquinas, produtos químicos, emergências, CIPA, contratadas, obrigações e fila do eSocial de um trabalho Operação SST 360.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho Operação SST 360.') }, ['workProjectId']),
    },
    permission: 'operations.read', mutating: false, reversible: false,
  },
  {
    definition: {
      name: 'run_operational_audit',
      description: 'Executa auditoria determinística da Operação SST 360 sem aprovar investigações, permissões, documentos legais ou transmissões.',
      riskLevel: 'LOW',
      parameters: objectSchema({ workProjectId: string('ID exato do trabalho Operação SST 360.') }, ['workProjectId']),
    },
    permission: 'operations.manage', mutating: true, reversible: false,
  },
  {
    definition: {
      name: 'create_work_project',
      description: 'Cria um Trabalho SST a partir de um fluxo oficial configurado, como AET, PGR, PCMSO ou LTCAT.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({
        companyId: string('ID exato da empresa.'),
        serviceType: string('Tipo do serviço, como AET, PGR, PCMSO, LTCAT, INSALUBRIDADE ou PERICULOSIDADE.'),
        title: string('Título opcional do trabalho.', { maxLength: 200 }),
        dueAt: string('Prazo opcional no formato AAAA-MM-DD.'),
      }, ['companyId', 'serviceType']),
    },
    permission: 'work.manage', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_establishment',
      description: 'Cria uma unidade ou estabelecimento dentro de uma empresa existente.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), name: string('Nome da unidade.', { minLength: 2, maxLength: 150 }), cnpj: string('CNPJ opcional.'), addressLine: string('Rua ou logradouro.'), number: string('Número.'), district: string('Bairro.'), city: string('Cidade.'), state: string('UF.', { maxLength: 2 }), zipCode: string('CEP.'), employeeCount: integer('Quantidade de trabalhadores.', { minimum: 0, maximum: 1000000 }) }, ['companyId', 'name']),
    },
    permission: 'company.write', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_sector',
      description: 'Cria um setor em uma unidade existente da mesma empresa.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), establishmentId: string('ID exato da unidade.'), name: string('Nome do setor.', { minLength: 2, maxLength: 150 }), description: string('Descrição opcional.', { maxLength: 2000 }), employeeCount: integer('Quantidade de trabalhadores.', { minimum: 0, maximum: 1000000 }) }, ['companyId', 'establishmentId', 'name']),
    },
    permission: 'company.write', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_ghe',
      description: 'Cria um Grupo Homogêneo de Exposição em um setor existente.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), sectorId: string('ID exato do setor.'), name: string('Nome do GHE.', { minLength: 2, maxLength: 150 }), code: string('Código opcional.', { maxLength: 50 }), description: string('Descrição opcional.', { maxLength: 2000 }), employeeCount: integer('Quantidade de trabalhadores.', { minimum: 0, maximum: 1000000 }), shift: string('Turno opcional.', { maxLength: 120 }), workday: string('Jornada opcional.', { maxLength: 300 }) }, ['companyId', 'sectorId', 'name']),
    },
    permission: 'company.write', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_job_function',
      description: 'Cria uma função/cargo vinculada a um GHE.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), gheId: string('ID exato do GHE.'), name: string('Nome da função.', { minLength: 2, maxLength: 150 }), cbo: string('CBO opcional.', { maxLength: 20 }), description: string('Descrição opcional.', { maxLength: 5000 }), employeeCount: integer('Quantidade de trabalhadores.', { minimum: 0, maximum: 1000000 }), activities: array('Lista de atividades da função.', string('Atividade.', { maxLength: 500 })) }, ['companyId', 'gheId', 'name']),
    },
    permission: 'company.write', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_workstation',
      description: 'Cria um posto de trabalho vinculado a um GHE.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), gheId: string('ID exato do GHE.'), name: string('Nome do posto.', { minLength: 2, maxLength: 150 }), description: string('Descrição opcional.', { maxLength: 5000 }) }, ['companyId', 'gheId', 'name']),
    },
    permission: 'company.write', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'create_inspection',
      description: 'Cria uma vistoria em rascunho para uma empresa e, opcionalmente, para um GHE.',
      riskLevel: 'MEDIUM',
      parameters: objectSchema({ companyId: string('ID exato da empresa.'), gheId: string('ID opcional do GHE.'), title: string('Título da vistoria.', { minLength: 3, maxLength: 200 }), notes: string('Observações iniciais.', { maxLength: 5000 }) }, ['companyId', 'title']),
    },
    permission: 'inspection.manage', mutating: true, reversible: true,
  },
  {
    definition: {
      name: 'update_work_requirement',
      description: 'Atualiza requisito de um Trabalho SST. Dispensa exige justificativa técnica e aprovação destacada.',
      riskLevel: 'HIGH',
      parameters: objectSchema({ workProjectId: string('ID exato do Trabalho SST.'), requirementId: string('ID do requisito, quando conhecido.'), requirementCode: string('Código do requisito, quando o ID não for conhecido.'), status: string('PENDING, SATISFIED, WAIVED ou BLOCKED.', { enum: ['PENDING', 'SATISFIED', 'WAIVED', 'BLOCKED'] }), justification: string('Justificativa obrigatória para WAIVED e recomendada para BLOCKED.', { maxLength: 4000 }) }, ['workProjectId', 'status']),
    },
    permission: 'work.manage', mutating: true, reversible: true,
  },
] as const;

const byName = new Map(operationalToolCatalog.map((item) => [item.definition.name, item]));

export function operationalToolFor(name: string): OperationalToolSpec | null {
  return byName.get(name as OperationalToolName) ?? null;
}

export function operationalToolDefinitions(): AIToolDefinition[] {
  return operationalToolCatalog.map((item) => item.definition);
}

export function isOperationalToolName(value: string): value is OperationalToolName {
  return byName.has(value as OperationalToolName);
}
