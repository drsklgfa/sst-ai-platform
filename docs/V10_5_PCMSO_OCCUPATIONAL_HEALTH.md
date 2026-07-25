# Checkpoint 10.5 — PCMSO e Gestão de Saúde Ocupacional

## Objetivo

Transformar o Trabalho SST do tipo PCMSO em um processo rastreável, integrado ao PGR e protegido por segregação médica, reutilizando empresa, estabelecimentos, GHEs, funções, riscos, documentos, auditoria, workflows e Copiloto já existentes.

## Separação entre operação SST e área médica

O módulo aplica menor privilégio em dois domínios lógicos:

### Gestão ocupacional

Pode administrar:

- programa PCMSO;
- população ocupacional;
- clínicas e prestadores;
- catálogo e matriz de exames;
- convocações e vencimentos;
- indicadores agregados;
- auditoria de completude;
- preparação de rascunhos S-2220.

### Área médica restrita

Exige permissões clínicas específicas para:

- visualizar ou alterar dados clínicos;
- registrar avaliações e exames vinculados ao ASO;
- definir aptidão;
- registrar restrições e observações médicas;
- emitir ASO.

Toda leitura, alteração, emissão, exportação ou preparação de eSocial ligada a dados médicos pode gerar `MedicalDataAccessLog` com usuário, finalidade, entidade e contexto.

## Programa PCMSO

O `PcmsoProgram` é único por Trabalho SST e reúne:

- escopo e diretrizes;
- período de referência;
- médico responsável;
- vínculo com o PGR;
- critérios de planejamento e acompanhamento;
- população ocupacional;
- matriz de avaliações clínicas e exames;
- convocações;
- ASOs;
- relatórios analíticos;
- rascunhos S-2220;
- auditorias de completude.

O workflow PCMSO versão 2 cobre identificação, organização, população, riscos, planejamento médico, monitoramento, relatório analítico, eSocial e documento final.

## População ocupacional

Cada trabalhador pode registrar:

- nome e nome social;
- CPF criptografado e hash para deduplicação;
- matrícula ou categoria;
- admissão e desligamento;
- estabelecimento;
- função;
- GHE;
- situação ocupacional.

O CPF não é persistido em texto aberto. A plataforma normaliza, valida, criptografa e gera hash determinístico para evitar duplicidade dentro do tenant.

## Clínicas e profissionais

Podem ser cadastrados:

- clínicas;
- laboratórios;
- médicos responsáveis pelo PCMSO;
- médicos examinadores;
- outros profissionais autorizados.

O cadastro profissional inclui conselho, número, UF, especialidade e vínculo opcional com prestador. CPF profissional sensível também é protegido.

## Catálogo e matriz de exames

O catálogo pode conter avaliação clínica e exames complementares com código interno, nome, tipo, descrição e código de procedimento para o eSocial.

A matriz permite definir regras por:

- GHE;
- função;
- risco do PGR;
- tipo de exame ocupacional;
- periodicidade;
- gatilho;
- obrigatoriedade;
- protocolo médico;
- justificativa.

Tipos suportados:

- admissional;
- periódico;
- retorno ao trabalho;
- mudança de risco;
- monitoração pontual;
- demissional.

A seleção de regras e o cálculo de vencimentos são determinísticos. Datas no fim do mês são preservadas pelo algoritmo de periodicidade.

## Convocações e vencimentos

A geração de convocações:

- identifica regras aplicáveis ao trabalhador;
- utiliza função e GHE;
- calcula a menor periodicidade aplicável;
- considera último ASO, admissão ou data de referência;
- evita duplicação do mesmo ciclo;
- sinaliza convocações vencidas;
- permite associação com clínica ou prestador.

## ASO

A emissão de ASO exige `medical.aso.issue` e área médica ativada.

O registro contém:

- trabalhador;
- tipo de exame ocupacional;
- data do ASO;
- médico emitente;
- conclusão de aptidão;
- restrições e observações protegidas;
- avaliações clínicas e exames realizados;
- código de procedimento;
- data e situação do resultado;
- vínculo com convocação.

A plataforma não disponibiliza ferramenta do Copiloto para declarar aptidão ou emitir ASO. Essas decisões permanecem humanas e médicas.

## Relatório analítico

O relatório analítico é gerado por período e utiliza somente dados agregados. Pode consolidar:

- população acompanhada;
- quantidade de avaliações e exames;
- ASOs por tipo;
- aptos e inaptos em nível agregado;
- resultados alterados agregados;
- convocações e pendências;
- recomendações e limitações.

Dados clínicos individuais não são expostos no relatório geral.

## Preparação do S-2220

O checkpoint prepara um rascunho estruturado do evento S-2220, sem transmissão automática.

O motor contempla:

- leiaute S-1.3;
- identificação do empregador por CPF ou CNPJ;
- raiz de oito posições do CNPJ quando aplicável;
- suporte ao CNPJ alfanumérico de 14 posições;
- matrícula ou categoria do trabalhador;
- tipos de exame ocupacional, inclusive monitoração pontual;
- ASO, avaliações e exames;
- médico emitente;
- médico responsável pelo PCMSO quando informado;
- validação de CPF, conselho, datas e códigos de procedimento.

Um rascunho somente fica pronto quando não há erro determinístico. O módulo não assina, transmite, consulta protocolo, retifica ou exclui eventos neste checkpoint.

## Auditoria de completude

A auditoria verifica, entre outros:

- escopo do programa;
- médico responsável;
- referência ao PGR;
- população ativa;
- catálogo de exames;
- regras da matriz;
- trabalhadores sem cobertura;
- convocações vencidas ou sem prestador;
- ASOs sem aptidão ou sem exames;
- rascunhos S-2220 inválidos;
- relatório analítico;
- progresso do workflow.

O resultado fica registrado como `PASSED`, `PASSED_WITH_WARNINGS` ou `FAILED`, com pontuação e achados.

## Copiloto

Ferramentas adicionadas:

- `get_pcmso_overview`: consulta panorama agregado do programa;
- `run_pcmso_audit`: executa a auditoria determinística.

O catálogo não oferece ferramenta de aptidão, emissão de ASO, alteração de prontuário ou leitura clínica irrestrita.

## Feature flags

```env
FEATURE_PCMSO=false
FEATURE_MEDICAL_AREA=false
FEATURE_ESOCIAL_S2220=false
```

As três áreas podem ser homologadas e ativadas de forma independente. A estrutura anterior continua funcionando quando permanecem desativadas.
