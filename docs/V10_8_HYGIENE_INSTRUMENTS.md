# Checkpoint 10.8 — Higiene Ocupacional e Gestão de Equipamentos

## Objetivo

Transformar as avaliações ambientais em um fluxo técnico rastreável, integrado ao Trabalho SST, ao núcleo histórico de exposições, ao PGR, LTCAT, PPP, S-2240, insalubridade, plano de ação e documentos. O módulo controla reconhecimento, estratégia de amostragem, execução de campo, instrumentos, calibrações, dados brutos, memória de cálculo, revisão profissional e auditoria.

## Programa de higiene ocupacional

Cada Trabalho SST do tipo `HIGIENE_OCUPACIONAL` pode possuir um `OccupationalHygieneProgram` com:

- escopo e objetivo;
- responsável técnico;
- metodologia;
- referências legais e técnicas;
- limitações;
- planos de amostragem;
- medições e amostras;
- instrumentos e calibrações;
- histórico metrológico;
- auditorias de completude.

## Reconhecimento e estratégia de amostragem

Cada plano pode registrar:

- agente ou objetivo da avaliação;
- categoria física, química ou biológica;
- avaliação qualitativa, quantitativa ou mista;
- GHE, função, posto e trabalhador representativo;
- estratégia por GHE, tarefa, fonte, área, trabalhador ou ponto fixo;
- quantidade mínima de amostras;
- duração esperada;
- método, versão e técnica;
- critérios de aceitação;
- checklist de campo;
- data programada;
- observações e limitações.

Os requisitos do workflow são satisfeitos a partir dos registros reais: grupo representativo, checklist, método, amostras mínimas, calibração, dados brutos, memória de cálculo, incerteza, comparação com critérios e revisão profissional.

## Catálogo técnico versionável

O catálogo inicial contempla:

- NHO 01 — ruído ocupacional;
- NHO 06 — calor;
- NHO 07 — calibração de bombas de amostragem;
- NHO 08 — material particulado suspenso no ar;
- NHO 09 — vibração de corpo inteiro;
- NHO 10 — vibração de mãos e braços;
- NHO 11 — iluminamento;
- avaliações químicas pela NR-9 e método aplicável;
- avaliações biológicas qualitativas;
- método personalizado.

Cada item registra edição, categoria, exigência de instrumento, limitações e disponibilidade de motor determinístico. Novas edições podem ser adicionadas sem substituir os registros históricos.

## Motores determinísticos

Foram implementados motores estruturados para:

- média ponderada no tempo;
- IBUTG com e sem carga solar;
- soma de frações de dose de ruído;
- resultante vetorial de vibração;
- interpretação por nível de ação e limite de tolerância.

O resultado conserva:

- entradas utilizadas;
- fórmula;
- parcelas intermediárias;
- resultado normalizado;
- unidade;
- limitações;
- validação da calibração de campo;
- versão do método.

Métodos sem motor validado não recebem resultado inventado. Exigem resultado manual, referência técnica e revisão do profissional.

## Medições e amostras

Cada medição pode guardar:

- plano de origem;
- agente canônico de exposição;
- instrumento e certificado de calibração;
- data, início e término;
- resultado bruto e normalizado;
- unidade;
- nível de ação;
- limite de tolerância;
- interpretação;
- método, edição e técnica;
- dados brutos;
- condições ambientais;
- incerteza;
- calibração de campo antes e depois;
- memória de cálculo;
- observações;
- responsável pela revisão.

Estados suportados:

- rascunho;
- em processamento;
- revisão;
- aprovado;
- rejeitado;
- inválido.

Uma medição inválida não pode ser aprovada sem correção.

## Instrumentos e metrologia

O cadastro de equipamentos contempla:

- código interno;
- tipo;
- fabricante e modelo;
- número de série;
- patrimônio;
- faixa de medição;
- resolução;
- localização;
- detentor atual;
- necessidade de calibração;
- próxima calibração;
- status operacional;
- histórico de eventos.

Tipos iniciais incluem dosímetro, decibelímetro, calibrador acústico, bomba de amostragem, calibrador de vazão, medidor de estresse térmico, medidor de vibração, luxímetro, detector de gases e equipamento personalizado.

## Calibrações

Cada calibração pode registrar:

- certificado;
- laboratório;
- acreditação declarada;
- data de calibração;
- validade;
- resultado;
- incerteza;
- arquivo do certificado;
- status calculado;
- usuário responsável.

O instrumento é bloqueado quando:

- está aposentado, bloqueado ou em manutenção;
- a calibração obrigatória está ausente;
- o certificado está vencido, rejeitado ou pendente;
- a calibração de campo falha na tolerância definida.

## Histórico de movimentação

Eventos suportados:

- cadastro;
- reserva;
- retirada;
- devolução;
- manutenção;
- calibração;
- bloqueio;
- aposentadoria;
- transferência;
- inspeção.

O evento conserva origem, destino, responsável, data, vencimento, Trabalho SST relacionado e observações. Isso permite agenda, empréstimos, rastreio e bloqueio de uso indevido.

## Integração com exposições e documentos

Uma medição pode ser vinculada ao `OccupationalExposureAgent` existente. Dessa forma, o mesmo resultado revisado pode sustentar, conforme finalidade e aprovação técnica:

- PGR;
- LTCAT;
- PPP;
- S-2240;
- insalubridade;
- PCMSO;
- plano de ação;
- relatório de higiene ocupacional.

A integração não converte automaticamente uma medição em conclusão legal. Cada documento aplica sua própria finalidade, critério, período e responsabilidade técnica.

## Auditoria de completude

A auditoria verifica:

- escopo;
- responsável técnico;
- planos e estratégias;
- método e edição;
- quantidade mínima de amostras;
- instrumento aplicável;
- calibração válida;
- calibração de campo;
- dados brutos;
- memória de cálculo;
- nível de ação e limite;
- incerteza quando registrada ou exigida;
- revisão profissional;
- instrumentos bloqueados ou vencidos;
- limitações;
- progresso do workflow.

Resultados:

- `PASSED`;
- `PASSED_WITH_WARNINGS`;
- `FAILED`.

## Copiloto

Ferramentas liberadas:

- `get_hygiene_overview`;
- `run_hygiene_audit`.

A IA pode resumir, localizar pendências e iniciar a auditoria. Ela não recebe ferramentas para:

- criar uma medição inexistente;
- alterar dados brutos;
- aprovar resultado;
- escolher conclusão legal;
- declarar insalubridade;
- liberar LTCAT ou PPP;
- assinar relatório;
- ignorar calibração inválida.

## Documento de higiene ocupacional

O modelo documental contempla:

1. identificação;
2. objetivo e escopo;
3. reconhecimento das exposições;
4. grupos e cenários representativos;
5. estratégia e plano de amostragem;
6. métodos, versões e limitações;
7. instrumentos e calibrações;
8. dados de campo;
9. dados brutos;
10. memória de cálculo;
11. incerteza e controle de qualidade;
12. comparação com critérios;
13. interpretação técnica;
14. integração com exposições e documentos;
15. recomendações e plano de ação;
16. histórico metrológico;
17. anexos e responsabilidade técnica.

## Segurança e limites

- `FEATURE_OCCUPATIONAL_HYGIENE=false` por padrão;
- `FEATURE_INSTRUMENT_MANAGEMENT=false` por padrão;
- isolamento por consultoria;
- permissões distintas para leitura, gestão e revisão;
- revisão reservada ao profissional técnico vinculado;
- arquivos de calibração permanecem privados;
- resultados sem motor exigem entrada manual;
- nenhum dado visual ou textual é tratado como medição real;
- cada resultado preserva origem, método, instrumento, certificado e memória de cálculo.
