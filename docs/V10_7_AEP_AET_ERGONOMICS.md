# Checkpoint 10.7 — AEP, AET e ergonomia completa

## Objetivo

Transformar a ergonomia em um fluxo técnico rastreável, integrado ao Trabalho SST, à coleta de campo, ao PGR, ao plano de ação e ao motor documental. O módulo não gera uma AET somente por texto: ele registra demanda, atividade real, participação, métodos, achados, decisão da AEP, aprofundamento e revisão profissional.

## Estrutura do programa

Cada Trabalho SST AET pode possuir um `ErgonomicsProgram` com:

- escopo e objetivo;
- responsável interno;
- referências e limitações;
- demandas e origens;
- situações de trabalho;
- participação dos trabalhadores;
- avaliações e métodos;
- achados e recomendações;
- decisão da AEP;
- auditorias de completude.

## AEP

A Avaliação Ergonômica Preliminar registra:

- origem da demanda;
- situação, setor, função, GHE e posto;
- trabalho prescrito e trabalho real;
- atividades, variações, constrangimentos e estratégias;
- organização do trabalho;
- exigências físicas, cognitivas e psicossociais;
- sinais, queixas e mudanças relevantes;
- necessidade de medidas imediatas;
- decisão fundamentada sobre aprofundamento.

Conclusões suportadas:

- `NO_FURTHER_ACTION`: não foram encontrados elementos que exijam aprofundamento no escopo avaliado;
- `IMPROVEMENT_ACTIONS`: existem oportunidades de melhoria e acompanhamento;
- `AET_REQUIRED`: a situação exige aprofundamento por AET.

A conclusão somente é aprovada por usuário com `ergonomics.conclusion.approve`.

## Situação de trabalho e atividade real

A caracterização contempla:

- trabalho prescrito;
- trabalho efetivamente realizado;
- variabilidade;
- estratégias e regulações dos trabalhadores;
- constrangimentos;
- duração e frequência;
- pausas e turnos;
- população exposta;
- fatores ambientais;
- organização do trabalho;
- exigências cognitivas;
- fatores psicossociais.

Campos vazios não são tratados como informação preenchida.

## Participação dos trabalhadores

Podem ser registrados:

- entrevistas;
- observações;
- reuniões;
- oficinas;
- questionários;
- participação da CIPA ou representação;
- validação dos achados;
- devolutivas.

O registro mantém data, método, participantes, síntese, anexos e usuário responsável.

## Métodos ergonômicos

### Motores determinísticos disponíveis

- RULA;
- REBA;
- NIOSH.

As entradas são validadas e o resultado guarda versão do motor, score, classificação, limitações e revisão profissional.

### Métodos estruturados sem motor automático

- Strain Index;
- OCRA Checklist;
- ROSA;
- QEC;
- Snook e Ciriello;
- avaliação técnica manual;
- método personalizado.

Para esses métodos, o sistema não inventa pontuação. O profissional registra referência, versão, entradas, resultado e justificativa, com revisão obrigatória.

## Achados, riscos e ações

Cada achado pode conter:

- dimensão ergonômica;
- situação de trabalho;
- descrição e evidência;
- gravidade e prioridade;
- recomendação;
- responsável;
- prazo;
- status.

O achado é integrado ao cadastro canônico de riscos como categoria `ERGONOMIC`. Achados altos ou críticos podem gerar ações no plano sem duplicidade.

## Auditoria de completude

A auditoria verifica:

- escopo;
- responsável;
- demanda;
- situações de trabalho;
- comparação prescrito/real;
- participação;
- métodos;
- cálculos determinísticos;
- revisão profissional;
- achados;
- recomendações;
- ações para riscos relevantes;
- decisão da AEP;
- habilitação da etapa AET quando necessária;
- limitações;
- progresso do workflow.

Resultados:

- `PASSED`;
- `PASSED_WITH_WARNINGS`;
- `FAILED`.

## Copiloto

Ferramentas liberadas:

- `get_ergonomics_overview`;
- `run_ergonomics_audit`.

A IA pode resumir, apontar lacunas e executar a auditoria. Ela não recebe ferramentas para:

- aprovar a AEP;
- aprovar métodos;
- emitir ou assinar AET;
- alterar conclusão técnica;
- inventar medições ou scores.

## Documento AET

O modelo documental contempla:

1. identificação;
2. objetivo e demanda;
3. caracterização da organização;
4. população e estrutura;
5. situações de trabalho;
6. análise da atividade;
7. participação dos trabalhadores;
8. organização do trabalho;
9. dimensões físicas, cognitivas, psicossociais e ambientais;
10. métodos e resultados;
11. diagnóstico ergonômico;
12. decisão da AEP e justificativa de aprofundamento;
13. recomendações;
14. plano de ação;
15. conclusão;
16. evidências e anexos;
17. responsabilidade técnica.

## Segurança e limites

- `FEATURE_ERGONOMICS=false` por padrão;
- isolamento por consultoria;
- permissões separadas de leitura, gestão e conclusão;
- decisões técnicas reservadas ao responsável autorizado;
- métodos sem motor não recebem cálculo automático;
- fotografias e vídeos indicam situações, mas não substituem duração, frequência, força, peso, distância ou medição;
- todos os registros permanecem auditáveis e vinculados à fonte.
