# Checkpoint 10.4 — GRO/PGR e fatores psicossociais

## Objetivo

Transformar o Trabalho SST do tipo PGR em um processo contínuo e rastreável, reutilizando empresa, estabelecimentos, setores, GHEs, funções, vistorias, campanhas, riscos, ações, documentos, evidências e Copiloto já existentes.

## Estrutura operacional

O `PgrProgram` é único por Trabalho SST e reúne:

- escopo e referência temporal;
- critérios de avaliação e tomada de decisão;
- ciclo e gatilhos de revisão;
- inventário de riscos;
- participação dos trabalhadores;
- avaliações psicossociais agregadas;
- auditorias de completude.

O programa não substitui o `Risk` canônico. Cada `PgrRiskAssessment` pode criar ou atualizar o risco comum da empresa e guarda a fotografia técnica daquela revisão do PGR.

## Inventário de riscos

Cada item registra:

- código e categoria;
- perigo, fonte e circunstâncias;
- possíveis lesões ou agravos;
- GHE e grupos expostos;
- quantidade, frequência e duração;
- medidas existentes;
- dados de monitoramento;
- severidade, probabilidade e exposição;
- risco inicial e residual;
- origem, página e confiança;
- revisão profissional.

A pontuação é executada pelo motor determinístico da plataforma. A IA pode estruturar informações e sugerir a ferramenta, mas não calcula livremente a classificação.

## Plano de ação

Riscos moderados, altos e críticos recebem rascunhos de ações idempotentes. O sistema preserva vínculo com o risco, motivo, método e prioridade. Responsável, prazo, custo, evidências e eficácia continuam sendo tratados pelo módulo 5W2H existente.

A auditoria alerta quando uma ação não possui responsável ou prazo, quando está vencida ou quando riscos relevantes não estão cobertos.

## Participação dos trabalhadores

São aceitos registros de:

- entrevista;
- oficina;
- CIPA;
- consulta;
- campanha;
- observação;
- grupo focal;
- outro mecanismo participativo.

Cada registro informa data, grupos, quantidade de participantes, síntese, encaminhamentos, confidencialidade e eventual evidência.

## Fatores psicossociais relacionados ao trabalho

A consolidação utiliza campanhas já existentes e somente respostas submetidas e incluídas na consolidação. Os resultados:

- são agregados por dimensão;
- respeitam grupo mínimo configurado;
- ocultam pontuação quando a amostra é insuficiente;
- não mostram identificação de grupos no nível agregado mínimo;
- não constituem diagnóstico clínico individual;
- geram achados e recomendações organizacionais para revisão.

A análise deve concentrar-se nas condições, organização e gestão do trabalho, e não em culpabilizar ou classificar individualmente trabalhadores.

## Auditoria de completude

A auditoria verifica, entre outros:

- escopo, critérios e responsável;
- inventário vazio;
- fontes, agravos e grupos ausentes;
- controles existentes;
- cobertura do plano de ação;
- participação dos trabalhadores;
- psicossocial aprovado quando aplicável;
- ações vencidas ou sem responsável/prazo;
- progresso do workflow.

O resultado fica versionado como `PASSED`, `PASSED_WITH_WARNINGS` ou `FAILED`, com pontuação e snapshot.

## Copiloto

Ferramentas adicionadas:

- `get_pgr_overview`: consulta riscos, participação, psicossocial e última auditoria;
- `run_pgr_audit`: executa a auditoria determinística e registra o resultado.

Não foi criada ferramenta genérica de banco nem função para aprovar tecnicamente o PGR sem revisão humana.

## Feature flags

```env
FEATURE_PGR_GRO=false
FEATURE_PSYCHOSOCIAL_GRO=false
```

A estrutura existente permanece funcionando com ambas desativadas.
