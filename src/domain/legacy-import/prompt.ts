import type { AIToolDefinition } from '@/lib/integrations/ai';

export const LEGACY_EXTRACTION_SYSTEM = `Você é um extrator técnico de documentos brasileiros de Segurança e Saúde no Trabalho.
Sua função é somente identificar e transcrever dados existentes no documento, com rastreabilidade. Não invente, não atualize datas, não conclua aptidão médica, insalubridade, periculosidade ou exposição sem evidência textual.
Para cada fato, informe a página e um trecho curto da origem quando disponíveis. Use confiança baixa quando o documento estiver ilegível, contraditório ou quando houver inferência. Dados clínicos individuais devem ser classificados no domínio MEDICAL_SENSITIVE e nunca misturados a dados gerais.
Padronize CNPJ apenas em normalizedValue, preservando value como lido. Use entityKey estável para agrupar a mesma unidade, setor, GHE ou função. Use parentEntityKey para indicar a hierarquia.
Retorne obrigatoriamente pela ferramenta submit_legacy_extraction.`;

export function legacyExtractionPrompt(input: { filename: string; targetServices: string[]; localText?: string }) {
  return `Analise o arquivo ${input.filename} para migração ao cadastro e aos novos modelos da plataforma.
Serviços de destino selecionados: ${input.targetServices.join(', ') || 'não informados'}.
Extraia, quando existirem: dados cadastrais; unidades; setores; GHEs; funções; atividades; trabalhadores agregados; perigos; riscos; exposições; avaliações ambientais; equipamentos e calibrações; controles; EPI/EPC; exames previstos; responsáveis técnicos; planos de ação; vigências; metodologias e referências.
Para COMPANY use fieldPath: legalName, tradeName, cnpj, primaryCnae, riskGrade e employeeCount. Para ESTABLISHMENT use name, cnpj, addressLine, number, district, city, state, zipCode e employeeCount. Para SECTOR use name, description e employeeCount. Para GHE use name, code, description, employeeCount, shift e workday. Para FUNCTION use name, cbo, description, employeeCount e activities.
Não inclua dados ausentes. Preserve conflitos para revisão humana.${input.localText ? `\n\nConteúdo textual extraído localmente:\n${input.localText}` : ''}`;
}

export const submitLegacyExtractionTool: AIToolDefinition = {
  name: 'submit_legacy_extraction',
  description: 'Entrega a classificação e os fatos rastreáveis extraídos de um documento SST antigo.',
  riskLevel: 'LOW',
  strict: false,
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['detectedKind', 'summary', 'facts'],
    properties: {
      detectedKind: { type: 'string', enum: ['UNKNOWN','PGR','PCMSO','LTCAT','INSALUBRIDADE','PERICULOSIDADE','AET','AEP','HIGIENE_OCUPACIONAL','INVENTARIO_RISCOS','PLANO_ACAO','ASO','PPP','ORDEM_SERVICO','TREINAMENTO','OUTRO'] },
      referenceYear: { type: 'integer' },
      pageCount: { type: 'integer' },
      language: { type: 'string' },
      summary: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } },
      facts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['domain','entityType','fieldPath','label','value','confidence'],
          properties: {
            domain: { type: 'string' },
            entityType: { type: 'string' },
            entityKey: { type: 'string' },
            parentEntityKey: { type: 'string' },
            fieldPath: { type: 'string' },
            label: { type: 'string' },
            value: {},
            normalizedValue: {},
            sourcePage: { type: 'integer' },
            sourceLocator: { type: 'string' },
            sourceExcerpt: { type: 'string' },
            confidence: { type: 'integer', minimum: 0, maximum: 100 },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
};
