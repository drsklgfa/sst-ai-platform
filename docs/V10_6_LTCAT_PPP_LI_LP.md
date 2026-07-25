# Checkpoint 10.6 — LTCAT, PPP, insalubridade e periculosidade

## Objetivo

Criar uma fonte temporal única de exposições ocupacionais para alimentar LTCAT, PPP, S-2240, laudos de insalubridade, laudos de periculosidade e futuras avaliações de higiene ocupacional, sem duplicar agentes, períodos, medições, controles ou responsáveis técnicos.

## Fonte única de exposições

O `OccupationalExposureProgram` é vinculado ao Trabalho SST e reúne:

- escopo e finalidade;
- data de referência;
- profissional responsável;
- períodos ocupacionais;
- agentes e condições perigosas;
- medições e metodologia;
- EPC, EPI e controles administrativos;
- conclusões previdenciárias e trabalhistas;
- rascunhos de PPP e S-2240;
- auditorias de completude.

Os mesmos dados podem ser reutilizados por LTCAT, insalubridade, periculosidade, PGR, PCMSO e eSocial, respeitando a finalidade e o critério legal de cada documento.

## Histórico ocupacional

Cada período preserva:

- trabalhador, quando individual;
- estabelecimento, setor, GHE e função;
- atividades efetivamente realizadas;
- jornada e turno;
- data inicial e final;
- padrão de exposição;
- origem e responsável pelo registro.

Períodos individuais sobrepostos são bloqueados antes da gravação. Períodos abertos representam a condição atual e continuam auditáveis sem alterar documentos anteriores.

## Agentes e avaliações

Cada agente registra:

- código interno;
- categoria física, química, biológica, ergonômica, acidental ou perigosa;
- código aplicável ao eSocial;
- método qualitativo, quantitativo ou misto;
- intensidade, unidade e limite;
- técnica e base legal;
- frequência e padrão de exposição;
- tempo especial de 15, 20 ou 25 anos, quando tecnicamente aplicável;
- vínculo opcional com o risco do PGR.

Medições preservam metodologia, equipamento, modelo, número de série, certificado, validade da calibração, laboratório, incerteza, duração da amostragem e observações.

## EPC, EPI e neutralização

A eficácia não é presumida. Para EPI indicado como eficaz, o núcleo exige, quando aplicável:

- CA ou documento de avaliação;
- uso contínuo;
- orientação ou treinamento;
- validade e troca;
- condições de funcionamento;
- higienização.

Para EPC, a manutenção e a validade são consideradas. O sistema calcula se existe evidência mínima para alegar eficácia, mas não substitui a conclusão do profissional habilitado.

## LTCAT

O workflow LTCAT versão 2 contempla:

- responsabilidade e escopo previdenciário;
- documentos de origem;
- histórico ocupacional;
- ambientes e atividades;
- agentes nocivos;
- avaliações e calibrações;
- EPC e EPI;
- padrão de exposição;
- conclusão por período, GHE ou função;
- tempo especial;
- PPP;
- preparação do S-2240;
- documento final e anexos.

A conclusão pode permanecer em revisão. Para status `APPROVED`, a plataforma exige profissional técnico ativo e autorizado.

## PPP

O rascunho de PPP é gerado por trabalhador a partir dos períodos históricos aprovados ou revisáveis. Ele inclui:

- identificação do empregador e trabalhador;
- datas de cada período;
- estabelecimento, setor, função e atividades;
- exposições e resultados;
- eficácia de EPC/EPI;
- responsável pelos registros ambientais;
- alertas sobre lacunas ou sobreposições.

O PPP gerado é um rascunho técnico versionado. A emissão oficial, assinatura e integração externa permanecem sujeitas à homologação e revisão profissional.

## S-2240

O motor prepara um rascunho estruturado no leiaute S-1.3 com:

- identificação do empregador;
- CPF, matrícula ou categoria do trabalhador;
- data de início da condição;
- ambiente;
- atividades;
- agentes nocivos;
- avaliação qualitativa ou quantitativa;
- intensidade, unidade, limite e técnica;
- EPC/EPI e eficácia;
- responsável pelos registros ambientais.

O rascunho somente recebe estado validado quando não possui erros determinísticos. Este checkpoint não assina, transmite, retifica, exclui nem consulta protocolos do eSocial.

## Insalubridade

O workflow versão 2 permite:

- registrar períodos, funções e grupos abrangidos;
- selecionar o anexo da NR-15;
- justificar o método qualitativo, quantitativo ou misto;
- vincular medições e calibrações;
- avaliar EPC, EPI e neutralização;
- concluir por período, GHE ou função;
- registrar grau mínimo, médio, máximo ou ausência de caracterização;
- preservar fundamentação e ressalvas.

A conclusão aprovada depende de profissional habilitado. A IA não caracteriza nem define grau de forma autônoma.

## Periculosidade

O workflow versão 2 contempla:

- categoria e hipótese da NR-16;
- atividade ou operação;
- delimitação da área de risco;
- padrão permanente, intermitente, ocasional ou eventual;
- controles e condições operacionais;
- conclusão por período, GHE ou função;
- fundamentação técnica;
- aprovação profissional.

O catálogo inicial inclui explosivos, inflamáveis, eletricidade, violência física, motocicleta, radiações ionizantes e outras hipóteses cadastráveis.

## Auditoria

A auditoria verifica:

- escopo;
- responsável técnico;
- períodos e estrutura;
- agentes e base técnica;
- medições quantitativas;
- calibração;
- eficácia dos controles;
- conclusões pendentes;
- rascunhos PPP e S-2240;
- progresso do workflow.

O resultado pode ser `PASSED`, `PASSED_WITH_WARNINGS` ou `FAILED`, com pontuação e achados persistidos.

## Copiloto

Ferramentas adicionadas:

- `get_exposure_overview`;
- `run_exposure_audit`.

A IA pode consultar e auditar. Não recebe ferramenta para aprovar LTCAT, caracterizar insalubridade, caracterizar periculosidade, emitir PPP oficial ou transmitir S-2240.

## Feature flags

```env
FEATURE_EXPOSURE_CORE=false
FEATURE_LTCAT_PPP=false
FEATURE_INSALUBRIDADE=false
FEATURE_PERICULOSIDADE=false
FEATURE_ESOCIAL_S2240=false
```

Cada área pode ser homologada separadamente. Os dados permanecem preservados quando uma flag é desativada.
