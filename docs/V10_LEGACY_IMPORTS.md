# Checkpoint 10.1 — Importação e Migração de Acervo Antigo

## Objetivo

Transformar documentos antigos em dados estruturados e revisáveis, preservando o arquivo original e criando novos Trabalhos SST sem copiar cegamente conclusões anteriores.

## Formatos aceitos

- PDF nativo ou digitalizado;
- DOCX;
- XLSX/XLS;
- TXT, CSV, JSON e XML;
- JPG, PNG e WEBP.

Cada lote aceita até 20 arquivos, com limite de 50 MB por arquivo. O arquivo original é salvo no storage privado com hash SHA-256 antes de entrar na fila do Worker.

## Fluxo

1. O consultor cria um lote e escolhe os serviços de destino.
2. Os arquivos são preservados como `FileObject`.
3. Cada arquivo vira um `LegacyImportDocument` e um job `LEGACY_ANALYZE_DOCUMENT`.
4. O Worker escolhe OpenAI ou Gemini conforme a configuração ativa.
5. PDFs e imagens são enviados como entrada multimodal. DOCX e XLSX recebem extração textual local antes da análise.
6. A resposta estruturada cria `LegacyExtractedFact` com página, trecho, confiança e origem.
7. Divergências entre documentos criam `LegacyImportConflict`.
8. O profissional aprova, rejeita ou resolve cada dado.
9. Somente fatos aprovados podem ser aplicados.
10. A aplicação cadastra ou vincula a empresa, reaproveita a estrutura existente, cria Trabalhos SST e anexa os documentos antigos como fontes.

## Regras de segurança

- Nenhum dado é aplicado automaticamente após a análise.
- Dados de domínio `MEDICAL_SENSITIVE` exigem revisão individual.
- No perfil de dados `PROTECTED`, o Worker bloqueia documentos que não tenham sido declarados anonimizados.
- Campos existentes da empresa não são sobrescritos automaticamente.
- Um lote concluído não pode ser aplicado novamente.
- Reprocessamentos reutilizam Trabalhos SST e artefatos já criados pelo mesmo lote.
- O documento original permanece separado da extração e não é alterado.
- A rastreabilidade registra arquivo, página, trecho, confiança, provedor e modelo.

## Campos estruturais aplicados no 10.1

A primeira aplicação automática cobre, após aprovação:

- empresa: razão social, nome fantasia, CNPJ, CNAE, grau de risco e quantidade de trabalhadores;
- estabelecimentos: nome, CNPJ, endereço e população;
- setores: nome, descrição e população;
- GHEs: nome, código, descrição, população, turno e jornada;
- funções: nome, CBO, descrição, população e atividades.

Riscos, exposições, medições, exames, controles e conclusões já são extraídos e preservados como fatos rastreáveis. A transformação desses domínios em cadastros técnicos oficiais será feita nos checkpoints específicos de PGR, PCMSO, LTCAT, LI, LP, AET e higiene ocupacional.

## Ativação

```env
FEATURE_V10_WORKS=true
FEATURE_AI_SETTINGS=true
FEATURE_LEGACY_IMPORTS=true
```

Ative primeiro no staging. Configure um provedor pelo painel de IA e use arquivos fictícios ou anonimizados no primeiro teste.

## Teste de aceitação recomendado

1. Enviar um PGR antigo com dados cadastrais e estrutura.
2. Confirmar que o arquivo original aparece preservado.
3. Aguardar o Worker concluir a análise.
4. Conferir classificação, resumo, páginas e confiança.
5. Enviar um PCMSO ou LTCAT com um número divergente de trabalhadores.
6. Resolver o conflito escolhendo a fonte correta.
7. Aprovar os dados cadastrais e estruturais.
8. Aplicar a importação.
9. Confirmar empresa, unidade, setores, GHEs e funções.
10. Confirmar os Trabalhos SST e os artefatos de origem.
11. Repetir o comando de aplicação e confirmar que a duplicação é bloqueada.
