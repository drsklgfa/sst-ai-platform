# Checkpoint 10.9 — Universidade Corporativa, Treinamentos e Competências

## Objetivo

Transformar treinamentos de SST em um fluxo rastreável, versionado e integrado às empresas, trabalhadores, funções, GHEs, riscos, exposições e Trabalhos SST. O módulo cobre planejamento pedagógico, cursos virtuais, presenciais e semipresenciais, avaliações, prática, presença, certificados, reciclagens e matriz de competências.

## Programa e projeto pedagógico

Cada Trabalho SST do tipo `TREINAMENTO` pode possuir um `TrainingProgram` com:

- escopo e público-alvo;
- objetivos, pré-requisitos e metodologia;
- modalidade e carga horária;
- carga prática;
- nota mínima e tentativas;
- validade e retenção dos registros;
- instrutor e responsável técnico;
- cursos, trilhas, matrículas, sessões e auditorias.

## Cursos versionados e imutáveis

Cada curso guarda código, versão, modalidade, objetivos, programa, referências, conteúdo, avaliações, validade e requisitos práticos. Após a publicação, o conteúdo, as avaliações e as questões tornam-se imutáveis. Alterações exigem uma nova versão, preservando a correspondência entre o que foi ministrado e o certificado emitido.

O catálogo inicial possui modelos para integração SST, EPI, CIPA, eletricidade, movimentação de materiais, máquinas, construção, inflamáveis, emergência, saúde, espaço confinado, altura, ergonomia, fatores psicossociais, DDS e cursos personalizados. O catálogo não atribui cargas horárias genéricas quando a definição depende do caso e da norma aplicável.

## Portal individual do aluno

Cada matrícula pode receber um link individual temporário. O token bruto é exibido somente no momento da geração; o banco conserva apenas o hash SHA-256 e a validade. Gerar um novo link invalida o anterior.

O portal permite:

- visualizar curso, módulos e progresso;
- abrir aulas e materiais protegidos;
- acessar conteúdo externo;
- registrar tempo ativo por heartbeat;
- concluir aulas;
- responder avaliações;
- acompanhar resultado e pendências práticas;
- consultar certificado emitido.

O link funciona como credencial individual e deve ser compartilhado somente com o trabalhador correspondente.

## Conteúdo e registros de acesso

Aulas podem conter texto estruturado, links externos ou arquivos privados. O arquivo somente é entregue após a validação do token e do vínculo entre a matrícula, o curso e a aula.

Os registros incluem:

- abertura e conclusão;
- heartbeat de tempo ativo;
- duração acumulada;
- posição de conteúdo;
- hash de sessão, dispositivo e endereço quando fornecidos;
- tentativa de avaliação;
- check-in e presença em sessões.

O sistema não transforma a duração estimada da aula em presença fictícia. O tempo é acumulado pelas interações reais do portal.

## Avaliações

Tipos suportados:

- escolha única;
- múltipla escolha;
- verdadeiro ou falso;
- questão discursiva;
- avaliação diagnóstica;
- teórica;
- prática;
- recertificação.

Questões objetivas são corrigidas por código determinístico, com pesos, nota mínima e limite de tentativas. Questões discursivas nunca recebem nota automática: a tentativa fica pendente até a revisão humana por perfil autorizado.

## Avaliação prática e presença

Cursos que exigem prática somente podem ser concluídos após avaliação por instrutor ou avaliador autorizado. A avaliação pode guardar checklist, nota, evidência e observações. Sessões presenciais e ao vivo controlam data, horário, local ou link, instrutor, capacidade, presença, entrada, saída e assinatura.

## Trilhas e obrigatoriedade

As regras podem atribuir curso ou trilha conforme:

- função;
- GHE;
- categoria de risco;
- agente de exposição;
- requisito legal;
- decisão manual.

A aplicação é idempotente dentro do programa e cria matrículas somente para trabalhadores ativos e elegíveis. Uma nova edição anual pode ter outro programa e novas matrículas sem misturar o histórico anterior.

## Certificados

A emissão exige:

- aulas obrigatórias concluídas;
- avaliações obrigatórias aprovadas;
- prática aprovada quando aplicável;
- presença quando a modalidade exigir;
- matrícula concluída.

O certificado possui código e hash verificáveis, curso e versão, trabalhador, empresa, carga horária, nota, emissão, validade, instrutor e responsável. A página pública informa se está válido, vencido ou revogado.

A revogação exige motivo detalhado e invalida competências derivadas daquele certificado. Um certificado revogado não volta a ser considerado válido.

## Matriz de competências

As competências podem ser globais ou específicas da empresa e vinculadas a curso, função ou GHE. O certificado elegível atualiza a competência do trabalhador com origem, validade e verificador. Estados possíveis incluem pendente, válida, próxima do vencimento, vencida e revogada.

## Auditoria

A auditoria verifica:

- escopo e projeto pedagógico;
- público e instrutor;
- cursos e publicação;
- conteúdo obrigatório;
- avaliações e critérios;
- evidências de acesso;
- matrículas vencidas;
- prática pendente;
- certificados ausentes ou próximos do vencimento;
- regras de obrigatoriedade;
- matriz de competências;
- progresso do workflow.

## Copiloto

Ferramentas liberadas:

- `get_training_overview`;
- `run_training_audit`.

A IA pode resumir o programa e localizar pendências. Ela não pode emitir ou revogar certificado, aprovar prática, corrigir questão discursiva, declarar competência ou alterar presença.

## Limites atuais

Este checkpoint não inclui transmissão de vídeo própria, videoconferência incorporada, SCORM/xAPI completo, reconhecimento facial, proctoring biométrico ou notificações automáticas por e-mail/WhatsApp. O conteúdo virtual funciona com texto, arquivos e links externos. Essas integrações podem ser acrescentadas sem alterar o núcleo de cursos, matrículas, avaliações, certificados e competências.
