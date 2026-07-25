## 1.2.0-checkpoint.10.10

### Operação SST 360

- Adiciona programa operacional por empresa e Trabalho SST.
- Adiciona EPI/EPC, CA, estoque, transações, orientação e adequação.
- Adiciona acidentes, incidentes, quase acidentes, CAT, S-2210 e investigação.
- Adiciona permissões de trabalho com checklist, controles, medições, emissão e aprovação separadas.
- Adiciona máquinas, produtos químicos, emergência, simulados, CIPA, contratadas e obrigações legais.
- Adiciona portal ampliado da empresa e auditoria operacional determinística.
- Adiciona ferramentas consultivas do Copiloto sem decisões críticas.

### Integrações e comercial

- Adiciona fila versionada e idempotente para S-2210, S-2220 e S-2240.
- Adiciona planos SaaS, assinaturas, períodos, faturas, franquias e consumo.
- Adiciona webhooks de pagamento com HMAC, rate limit, idempotência e transições de fatura.
- Mantém transmissão oficial do eSocial e checkout externo desativados até homologação dos adaptadores.
- Adiciona 11 feature flags, todas desativadas por padrão.
- Total local: 262 testes automatizados aprovados.

## 1.2.0-checkpoint.10.8

### Higiene ocupacional e avaliações ambientais

- Adiciona programa de higiene ocupacional vinculado ao Trabalho SST e à empresa.
- Atualiza o workflow de Higiene Ocupacional para a versão 2.
- Adiciona reconhecimento, grupos representativos, estratégia, planos e quantidade mínima de amostras.
- Adiciona catálogo versionável de NHO 01, 06, 07, 08, 09, 10 e 11, avaliações químicas, biológicas e métodos personalizados.
- Adiciona cálculos determinísticos para média ponderada, IBUTG, frações de dose e resultante vetorial.
- Impede resultado automático para métodos sem motor validado.
- Preserva dados brutos, condições ambientais, incerteza, limites, memória de cálculo e calibração de campo.
- Integra medições aos agentes canônicos de exposição.

### Instrumentos, calibrações e metrologia

- Adiciona cadastro de instrumentos, status, localização, detentor e disponibilidade.
- Adiciona certificados, laboratório, validade, incerteza e arquivo de calibração.
- Bloqueia instrumento vencido, rejeitado, pendente, em manutenção, bloqueado ou aposentado.
- Adiciona histórico de reserva, retirada, devolução, manutenção, calibração, bloqueio, transferência e aposentadoria.
- Adiciona auditoria de completude e seções documentais especializadas.
- Adiciona ferramentas fechadas do Copiloto para panorama e auditoria.
- Adiciona `FEATURE_OCCUPATIONAL_HYGIENE` e `FEATURE_INSTRUMENT_MANAGEMENT`, desativadas por padrão.
- Total local: 213 testes automatizados aprovados.

## 1.2.0-checkpoint.10.7

### AEP, AET e ergonomia completa

- Adiciona programa ergonômico vinculado ao Trabalho SST e à empresa.
- Atualiza o workflow AET para a versão 2, com demanda, atividade real, participação, dimensões ergonômicas, métodos e diagnóstico.
- Registra trabalho prescrito e real, variabilidade, estratégias, constrangimentos, pausas, duração, frequência e turnos.
- Adiciona organização do trabalho, fatores físicos, cognitivos, psicossociais e ambientais.
- Preserva RULA, REBA e NIOSH como motores determinísticos.
- Estrutura OCRA, ROSA, QEC, Strain Index, Snook/Ciriello e métodos personalizados sem inventar pontuação.
- Adiciona revisão profissional das avaliações e decisão fundamentada da AEP.
- Integra achados ergonômicos ao risco canônico e ao plano de ação.
- Adiciona auditoria de completude e seções documentais completas de AEP/AET.
- Adiciona ferramentas fechadas do Copiloto para panorama e auditoria.
- Adiciona `FEATURE_ERGONOMICS`, desativada por padrão.
- Total local: 197 testes automatizados aprovados.

# Changelog

## 1.2.0-checkpoint.10.6

### Exposições, histórico e controles

- Fonte temporal única para períodos, agentes, medições, EPC, EPI e controles.
- Validação de datas, bloqueio de sobreposição individual e preservação histórica.
- Medições com metodologia, equipamento, série, calibração, laboratório, incerteza e duração.
- Avaliação determinística de evidências mínimas de eficácia e neutralização.

### LTCAT, PPP e S-2240

- Workflow LTCAT versão 2 com histórico, exposições, conclusão previdenciária, PPP e eSocial.
- Conclusões por período, GHE ou função, com aprovação exclusiva de profissional habilitado.
- Rascunho PPP por trabalhador, ordenado temporalmente e com alertas de lacunas ou sobreposição.
- Preparação S-2240 S-1.3 com ambiente, atividades, agentes, avaliações, EPC/EPI e responsável, sem transmissão.

### Insalubridade e periculosidade

- Workflow de insalubridade versão 2 com catálogo de anexos NR-15, método, medições, controles, neutralização e grau.
- Workflow de periculosidade versão 2 com categorias NR-16, área de risco, padrão de exposição e conclusão.
- Nenhuma conclusão técnica pode ser aprovada pela IA ou por perfil sem permissão específica.

### Copiloto, segurança e validação

- Ferramentas fechadas `get_exposure_overview` e `run_exposure_audit`.
- Feature flags independentes para núcleo, LTCAT/PPP, insalubridade, periculosidade e S-2240.
- 111 models Prisma e 79 enums validados offline.
- 183 testes automatizados aprovados, preservando os 168 anteriores.
- Typecheck offline, preflights e validação estrutural aprovados.

## 1.2.0-checkpoint.10.5

### PCMSO e saúde ocupacional

- Programa PCMSO integrado ao PGR, empresa e Trabalho SST.
- População ocupacional com CPF criptografado, hash de deduplicação, função e GHE.
- Prestadores, clínicas, laboratórios, médicos responsáveis e examinadores.
- Catálogo e matriz de avaliações clínicas/exames por GHE, função, risco e evento ocupacional.
- Convocações idempotentes, vencimentos e periodicidade determinística.
- ASO com aptidão, restrições, avaliações e exames sob permissão médica específica.
- Relatório analítico agregado e auditoria de completude.
- Logs de acesso a dados médicos sensíveis.

### eSocial e compatibilidade cadastral

- Preparação de rascunho S-2220 S-1.3, sem transmissão automática.
- Tipos admissional, periódico, retorno, mudança de risco, monitoração pontual e demissional.
- Validação de vínculo, CPF, exames, datas, procedimento, médico e CRM.
- Uso da raiz cadastral do CNPJ do empregador quando aplicável.
- Normalização de CNPJ numérico e alfanumérico de 14 posições.

### Copiloto, segurança e experiência

- Ferramentas fechadas `get_pcmso_overview` e `run_pcmso_audit`.
- Nenhuma ferramenta clínica para declarar aptidão, emitir ASO ou alterar prontuário.
- Perfis `OCCUPATIONAL_PHYSICIAN` e `MEDICAL_ASSISTANT` com menor privilégio.
- Página operacional própria do PCMSO e rotas auditadas.
- Recursos controlados por `FEATURE_PCMSO`, `FEATURE_MEDICAL_AREA` e `FEATURE_ESOCIAL_S2220`.

### Validação

- 99 models Prisma e 64 enums validados offline.
- 168 testes automatizados aprovados, preservando os 154 anteriores.
- Typecheck offline, preflights e validação estrutural aprovados.

## 1.2.0-checkpoint.10.4

### GRO/PGR

- Programa PGR vinculado ao Trabalho SST, com ciclo de revisão, escopo, critérios e referências versionadas.
- Inventário estruturado por categoria, GHE, fonte, circunstância, agravos, grupos expostos, controles e dados de monitoramento.
- Avaliação determinística inicial e residual pela matriz validada da plataforma.
- Fonte, página, confiança e vínculo com risco canônico preservados.
- Plano de ação gerado de forma idempotente para riscos moderados, altos e críticos.
- Auditoria de completude com erros, alertas, pontuação e histórico.

### Participação e fatores psicossociais

- Registros de entrevistas, oficinas, CIPA, consultas, campanhas, grupos focais e observações.
- Consolidação de campanhas psicossociais somente com respostas submetidas e válidas.
- Ocultação de grupos abaixo do mínimo, supressão de identificação em agregados pequenos e ausência de diagnóstico individual.
- Achados e recomendações coletivas submetidos à revisão profissional.

### Copiloto e experiência

- Ferramentas fechadas `get_pgr_overview` e `run_pgr_audit`.
- Página operacional própria do PGR com inventário, participação, psicossocial, ações e auditorias.
- Workflow PGR versão 2 com levantamento preliminar, participação, psicossocial, monitoramento, revisão e preservação histórica.
- Novos recursos desativados por `FEATURE_PGR_GRO` e `FEATURE_PSYCHOSOCIAL_GRO`.

### Validação

- 86 models Prisma e 50 enums validados offline.
- 154 testes automatizados aprovados, preservando os 141 anteriores.
- Typecheck offline, preflights e validação estrutural aprovados.

## 1.1.0-checkpoint.9.7

- Corrige a inicialização do Worker na imagem Docker.
- Inclui `tsconfig.json` no runtime para resolução dos imports `@/...`.
- Move `tsx` para dependência de produção e usa `npm run worker`.
- Adiciona verificações do runtime do Worker durante o Docker build.
- Torna o comando iniciado pelo entrypoint visível nos logs.

## 1.1.0-checkpoint.9.4

### Corrigido

- O componente compartilhado `Button` agora aceita variantes tipadas (`primary`, `secondary`, `outline`, `danger` e `ghost`).
- A propriedade `variant` é consumida pelo componente e não é repassada ao elemento HTML nativo.
- Corrigido o erro real de TypeScript na página `/settings/security`: `Property 'variant' does not exist on type ButtonHTMLAttributes<HTMLButtonElement>`.
- Mantido `secondary` para a ação de limpeza operacional, com apresentação visual própria.

### Validação

- Typecheck offline aprovado.
- Adicionados dois testes de regressão para o contrato do `Button` e seu uso na página de segurança.
- Total local atual: 87 testes aprovados.

## 1.1.0-checkpoint.9.3

- Corrigida definitivamente a repetição da falha em `prisma format --check`.
- O GitHub Actions agora executa o formatter oficial (`npx prisma format`) e imediatamente confirma o resultado com `npx prisma format --check`.
- `prisma validate` e `prisma generate` continuam obrigatórios; nenhuma verificação foi pulada.
- Adicionado o script `npm run db:format`.
- Adicionado teste de regressão que exige a ordem `format → format --check → validate → generate` no CI.

## 1.1.0-checkpoint.9.2

### Corrigido

- `prisma/schema.prisma` formatado segundo o padrão canônico do Prisma.
- Adicionados espaçamentos entre blocos, alinhamento dos campos e normalização dos argumentos de relações e índices.
- Corrigida a falha do GitHub Actions em `npx prisma format --check`.
- Mantidas integralmente as correções e funcionalidades dos checkpoints anteriores.

### Validação

- Validação estrutural do schema aprovada.
- Typecheck offline aprovado.
- Testes e preflights repetidos sobre a cópia completa.

## 1.1.0-checkpoint.9.1

### Corrigido

- A central de mensagens agora tipa explicitamente o mapa de responsáveis como `Map<string, string>`.
- O nome do responsável é normalizado por uma função que sempre retorna texto compatível com `ReactNode`.
- Corrigido o erro `TS2322: Type '{}' is not assignable to type 'ReactNode'` encontrado pelo GitHub Actions.
- Adicionado teste de regressão para impedir o retorno da expressão não tipada no JSX.

### Validação

- `npm run typecheck:offline`: aprovado.
- `npm run verify:offline`: aprovado.
- Total local atual: 83 testes aprovados.

## 1.1.0-checkpoint.9

### Validação TypeScript reforçada

- Gerador local de tipagens Prisma offline derivado diretamente do `schema.prisma`.
- Novo comando `npm run typecheck:offline`, sem contaminar o typecheck real de produção.
- Correção do retorno da transação de evidência do portal RH.
- Tipagem explícita do resultado da retenção agendada.
- Testes de regressão para impedir o retorno desses erros.

### Dependências e compilação

- Next.js atualizado dentro da linha 15 para `15.5.20`.
- React e React DOM atualizados dentro da linha 19.1 para `19.1.8`.
- Tipos de React DOM alinhados à linha 19.1.
- O typecheck real com Prisma Client continua obrigatório e separado da validação offline.

### CI e homologação

- Pipeline ampliado para doze etapas.
- Retentativas e tempos de espera do npm configurados.
- Cache do build Next.js.
- `prisma format --check`, `validate` e `generate`.
- Banco PostgreSQL e seed de teste.
- Typecheck real, testes e build.
- Construção da imagem Docker.
- Inicialização do Web e Worker usando a própria imagem.
- Endpoint de saúde e heartbeat do Worker obrigatórios para aprovação.
- Concorrência configurada para cancelar execuções antigas da mesma branch.

### Testes

- Total local atual: 82 testes aprovados.

## 1.1.0-checkpoint.8

### Segurança e governança

- Política de retenção por consultoria com prazos mínimos e preservação legal.
- Limpeza automática limitada a sessões expiradas, notificações lidas, jobs concluídos e convites expirados.
- Exclusão de auditoria desativada por padrão e incompatível com preservação legal.
- Registro de incidentes com gravidade, responsável, situação, datas e histórico de ações.
- Permissões próprias para auditoria, segurança e saúde do sistema.

### Observabilidade e recuperação

- Heartbeat do Worker a cada 30 segundos.
- Painel de saúde com banco, Worker, armazenamento, fila, incidentes e último backup.
- Testes assíncronos de integridade para backups, incluindo manifesto, checksums internos e SHA-256 do arquivo.
- Senhas de backups removidas do payload do job após conclusão ou falha definitiva.
- Endpoint de saúde sem cache e com estado resumido do Worker.

### Proteções adicionais

- Bloqueio de mutações cross-site usando Origin e Fetch Metadata.
- HSTS em produção e novos cabeçalhos de isolamento e política de domínio.
- Tela de auditoria com busca, filtros, paginação e comparação antes/depois.
- Backup portátil versão 8 inclui política, incidentes, integrações sem segredos e auditoria.
- Total local atual: 77 testes aprovados.

## 1.1.0-checkpoint.7

### Portal RH e comunicação

- Central de conversas com assunto, categoria, prioridade, situação, responsável e participantes.
- Distribuição automática para o integrante elegível com menor carga de conversas abertas.
- Mensagens com anexos, confirmação de leitura e notas internas invisíveis ao cliente.
- Estados de nova, em atendimento, aguardando empresa, aguardando consultoria, resolvida, arquivada e reaberta.
- Portal RH recebe somente conversas, comentários, arquivos e notificações permitidos pelo perfil.

### Notificações e acompanhamento

- Central de notificações interna e no portal, com leitura individual e em lote.
- Alertas para novas mensagens, atribuições, mudanças de situação, documentos liberados, ações atualizadas e evidências enviadas ou revisadas.
- Destinatários filtrados por empresa, participação, permissão e preferência de silenciamento.
- Links das notificações direcionam corretamente para o painel interno ou para o portal.

### Comentários, evidências e arquivos

- Comentários vinculados a ações, evidências, documentos e riscos.
- Visibilidade interna ou compartilhada com o cliente, com anexos e auditoria.
- Arquivos internos de comunicação protegidos por permissão; o RH não acessa notas ou anexos privados.
- Atualizações do 5W2H e revisões de evidência geram histórico e avisos operacionais.

### Portabilidade e testes

- Backup portátil versão 7 preserva conversas, participantes, mensagens, anexos, comentários, notificações relacionadas e linha do tempo.
- Restauração remapeia usuários, entidades e arquivos sem reutilizar IDs antigos.
- Total local atual: 69 testes aprovados.

## 1.1.0-checkpoint.6

### Modelos e revisões

- Modelos documentais administráveis por tipo, com rascunho editável, publicação imutável e nova versão baseada na anterior.
- Documento passa a controlar revisão atual, revisão liberada e código público de verificação.
- A primeira prévia congela a revisão corrente sem criar uma revisão artificial.
- Revisões congeladas ou emitidas não aceitam alteração de seções; mudanças exigem nova revisão.

### Snapshot, auditoria e integridade

- Snapshot canônico com hash SHA-256 reúne empresa, estrutura, campanhas, riscos, ações, vistorias, cálculos, modelo e seções.
- PDF, DOCX e XLSX são gerados exclusivamente do snapshot imutável.
- Auditoria pré-emissão registra verificações, avisos, erros e justificativa técnica.
- Página pública de verificação mostra somente metadados, revisão, responsáveis e hashes.

### Assinatura e emissão

- Assinaturas e PDFs externos vinculados à revisão e ao hash exatos.
- Prévia com marca d'água separada do PDF oficial.
- Emissão valida integridade do snapshot e quantidade de assinaturas.
- Liberação atômica mantém o último PDF oficial disponível até a nova revisão ser produzida e validada.
- Arquivo de uma revisão não liberada não pode ser acessado pelo portal, mesmo com a URL.

### Portabilidade e testes

- Backup portátil versão 6 preserva snapshots, auditorias, assinaturas, arquivos e vínculos de revisão.
- Restauração remapeia IDs e cria novo código público de verificação.
- Total local atual: 60 testes aprovados.

## 1.1.0-checkpoint.5

### Vistorias e evidências de campo

- Caracterização da atividade, ambiente, organização do trabalho, participantes e trabalhadores observados.
- Checklist técnico por categoria, código, resultado, observação, recomendação e criticidade.
- Fotos, documentos e medições vinculados à vistoria com legenda e arquivo privado.
- Estados de rascunho, andamento, conclusão e revisão; vistoria revisada fica imutável e exige justificativa para reabertura.

### Métodos e memória de cálculo

- NIOSH ampliado com multiplicador de duração e validação de faixas.
- RULA e REBA com limites de entrada e memória de cálculo persistida.
- Todos os cálculos são auditados e vinculados à metodologia e versão do motor.

### Inventário de riscos

- Cadastro e edição de riscos por empresa, GHE e vistoria de origem.
- Matriz 5x5 com severidade, probabilidade e exposição.
- Avaliação inicial e residual, eficácia dos controles, expostos, frequência, duração, metodologia, controles e referências.
- Revisões, arquivamento lógico e indicadores de riscos altos/críticos sem ação vinculada.

### Plano de ação 5W2H

- Planos anuais e ações vinculadas ao risco.
- Responsável, verificador, prazo, prioridade, local, motivo, método, custos e progresso.
- Evidências do cliente e da consultoria, revisão técnica, rejeição justificada e aprovação.
- Verificação de eficácia, risco residual, motivo de atraso e próxima revisão.
- Worker marca automaticamente ações vencidas e registra auditoria.

### Backup e testes

- Backup portátil versão 5 com evidências da vistoria, vínculos de riscos e campos ampliados do 5W2H.
- Restauração remapeia arquivos, vistorias, riscos, ações e evidências sem colisão de IDs.
- Total local atual: 51 testes aprovados.

## 1.1.0-checkpoint.4

### Questionários versionados

- Cadastro de questionários e criação de rascunhos.
- Perguntas com tipos, opções, dimensões, escalas, posição e condições.
- Publicação imutável e clonagem para nova versão.
- Validação de opções, códigos condicionais e tipos não suportados.

### Campanhas e participação anônima

- Campanhas gerais ou segmentadas por múltiplos GHEs.
- Vários questionários publicados por campanha.
- Abertura e encerramento programados no horário do navegador.
- Worker sincroniza abertura e encerramento automaticamente com auditoria.
- Links e QR Codes próprios por GHE.
- Códigos anônimos de uso único exportados apenas em CSV; o banco armazena somente hashes.
- Bloqueio de duplicidade por navegador e campanha sem armazenar IP bruto.
- Validação servidor de perguntas obrigatórias, opções, números, datas e condições.
- Salvamento automático e retomada no navegador.
- Alertas de conclusão rápida e repetição extensa.

### Moderação e privacidade

- Moderação auditável com inclusão e exclusão da consolidação.
- Justificativa obrigatória para excluir resposta.
- Supressão de resultados abaixo do grupo mínimo.
- Consolidação psicossocial somente com respostas incluídas.
- Backup portátil versão 4 sem exportar códigos reutilizáveis.
- Após restauração, campanhas com códigos exigem nova geração.
- Validador do schema passou a detectar valores duplicados em enums.

### Testes

- Testes de agendamento, condições, validação, qualidade, anonimato, backup e scheduler.
- Total local atual: 43 testes aprovados.

## 1.1.0-checkpoint.3

### Empresas e cadastros operacionais

- Edição auditada dos dados cadastrais e da situação da empresa.
- Unidades, setores, GHEs, funções e postos com edição e arquivamento lógico.
- Registros arquivados permanecem nos históricos, mas não podem ser usados em novos fluxos.
- Validação da cadeia empresa → unidade → setor → GHE.
- Contatos com edição, canal preferido, contato principal, arquivamento e reativação.

### Serviços e controle comercial

- Novo cadastro de serviços contratados, sem gateway de pagamento.
- Valor, contratação, início, prazo, entrega, renovação, responsável e pedido/contrato.
- Estados de proposta, contratado, execução, espera, entrega, conclusão, suspensão, cancelamento e vencimento.
- Alertas no painel para serviços atrasados e renovações em 30 dias.

### Portabilidade e testes

- Backup portátil atualizado para incluir serviços e estados ativos/arquivados.
- Formato do backup ampliado para versão 3.
- Testes de moeda, datas, atividades, schema operacional, autorização e portabilidade.
- Total local atual: 29 testes aprovados.

## 1.1.0-checkpoint.2

### Autenticação e sessões

- Redirecionamento após login e ativação conforme o usuário seja interno ou do portal.
- Limpeza de sessões expiradas e limite de dez sessões por usuário.
- Suspensão de acessos encerra sessões existentes.
- Convites internos e empresariais expiram em 72 horas e invalidam convites pendentes anteriores.

### Permissões e isolamento

- Permissões explícitas em todas as rotas internas mutáveis.
- Perfis internos e empresariais tipados e testados.
- Interface oculta ações não autorizadas.
- Portal consulta somente recursos permitidos por perfil.
- Proteção contextual de arquivos, backups, documentos oficiais e evidências.
- Campanhas e vistorias validam se o GHE pertence à empresa.

### Administração de acessos

- Nova área de equipe interna em `/settings/users`.
- Convite, suspensão, reativação e novo convite para integrantes.
- Acessos do RH agora podem ser suspensos, reativados e convidados novamente.
- Auditoria das alterações de vínculo.

### Testes

- Matriz RBAC interna e do portal.
- Verificação automática de autorização nas rotas mutáveis.
- Total local atual: 24 testes aprovados.

## 1.1.0-checkpoint.1

### Corrigido

- Schema Prisma já permanece no formato aceito pelo Prisma 6.
- Tipagem de `unzipper` e fluxos de restauração preservados da versão 1.0.2.
- Separação entre utilitários client e `node:crypto` preservada.
- Campos JSON do Prisma agora usam `toPrismaJson` e `toPrismaNullableJson`.
- `audit`, fila, snapshots, seções e resultado do Worker deixaram de enviar `unknown` diretamente ao Prisma.
- O provider S3 voltou a implementar integralmente a interface, incluindo `exists`.
- `S3_FORCE_PATH_STYLE` agora é convertido para booleano real.

### Segurança e configuração

- Seed sem credenciais fixas de demonstração.
- Credenciais demonstrativas removidas da tela de login.
- Administrador e consultoria inicial definidos por variáveis `SEED_*`.
- Senha inicial mínima de 12 caracteres.
- Validação condicional para S3, Gemini e Resend.
- Web e Worker usam controle explícito de sincronização do schema.

### Infraestrutura

- GitHub Actions organizado em dez etapas.
- CI agora cria o banco, executa seed, typecheck, testes, build e Docker build.
- Docker usa entrypoint próprio e evita sincronização duplicada pelo Worker.
- Documentação e `.env.example` atualizados.

### Testes

- Testes de normalização JSON.
- Testes positivos e negativos dos preflights.
- Total local atual: 18 testes aprovados.

## 1.1.0-checkpoint.9.5

### Runtime Docker e healthcheck

- O servidor Next.js standalone agora recebe `HOSTNAME=0.0.0.0` na imagem final e na homologação.
- O teste Docker deixou de depender de `--network host` e do PostgreSQL externo do runner.
- A homologação cria uma rede Docker isolada e um PostgreSQL 16 próprio.
- O Web publica explicitamente a porta `3000:3000` e aplica o schema antes do healthcheck.
- O Worker inicia somente depois de Web e banco estarem saudáveis.
- O teste detecta encerramento prematuro dos contêineres Web e Worker.
- Em caso de falha, o CI mostra o último status HTTP, corpo da resposta, inspect e logs dos três contêineres.
- Foram adicionados testes de regressão para bind, rede Docker, PostgreSQL e diagnóstico.
- Total local atual: 90 testes aprovados.

## 1.1.0-checkpoint.9.6

### Prisma no runtime Docker

- O Prisma Client agora é gerado com `binaryTargets = ["native", "debian-openssl-3.0.x"]`.
- Os estágios `deps`, `builder` e `runner` instalam OpenSSL explicitamente.
- O Docker build confirma a presença de `libquery_engine-debian-openssl-3.0.x.so.node` antes de criar a imagem final.
- Corrige o healthcheck 503 causado pela ausência do Query Engine compatível com Debian Bookworm/OpenSSL 3.
- Foram adicionados testes de regressão para o target do Prisma, OpenSSL e presença do engine.
- Total local atual: 92 testes aprovados.

## 1.1.0-checkpoint.9.8

### Preparação para Railway

- O `railway.toml` compartilhado deixou de impor healthcheck HTTP a todos os serviços.
- Adicionados `railway.web.toml` e `railway.worker.toml` com configurações próprias.
- Web mantém `/api/health`; Worker não recebe domínio nem healthcheck HTTP.
- Worker inicia pelo entrypoint da imagem com `npm run worker`, preservando `RUN_DB_SCHEMA_SYNC=false`.
- Documentação de Railway atualizada para Web, Worker, PostgreSQL, Bucket, variáveis, seed e testes de homologação.
- Total local previsto: 98 testes aprovados.

## 1.1.0-checkpoint.9.9

### Compatibilidade do Worker na Railway

- A política de reinício do Worker mudou de `ALWAYS` para `ON_FAILURE`.
- Definido limite de 10 reinícios automáticos após falhas.
- Corrige a inicialização em contas Railway Free/trial, nas quais `ALWAYS` não está disponível.
- O processo continua persistente e só deixa de reiniciar quando encerra normalmente.
- Adicionado teste de regressão da política de implantação.
- Total local previsto: 99 testes aprovados.

## Checkpoint 9.10

- Inclui `scripts/` na imagem final Docker para permitir `npm run preflight:seed` via Railway SSH.
- Faz o build falhar se `preflight-seed.mjs` ou `prisma/seed.ts` não estiverem no runtime.

## 1.1.0-checkpoint.9.11

- Corrige redirecionamentos que usavam o endereço interno do contêiner (`0.0.0.0:8080`) no Railway.
- Login, logout, ativação e rotas de formulário passam a usar `APP_URL` como origem pública canônica.
- Middleware usa `APP_URL` para encaminhar usuários não autenticados à tela de login.
- Adiciona testes de regressão para impedir redirects públicos baseados em `request.url`.

## 1.2.0-checkpoint.10.0

### Fundação da Plataforma SST orientada por IA

- Adiciona Trabalho SST central, workflows versionados, etapas, requisitos, artefatos e decisões.
- Adiciona aprovações por risco e ChangeSets preparados para confirmação e reversão.
- Adiciona threads, mensagens, ferramentas e consumo da IA com rastreabilidade por empresa e trabalho.
- Adiciona OpenAI e Gemini sob uma interface comum com function calling.
- Adiciona painel de configuração com chave criptografada, modelos, limites, política de dados e autonomia.
- Adiciona workflows iniciais de AET, PGR, PCMSO, LTCAT, LI, LP, higiene ocupacional e treinamentos.
- Adiciona central de Trabalhos SST e cálculo automático de progresso.
- Mantém os novos módulos desativados por feature flags até homologação.
- Total local: 113 testes automatizados aprovados.

## 1.2.0-checkpoint.10.1

### Importação e migração de acervo antigo

- Adiciona lotes de importação, documentos legados, fatos extraídos e conflitos entre fontes.
- Preserva cada arquivo original no storage privado com hash SHA-256 e rastreabilidade.
- Adiciona análise multimodal por OpenAI ou Gemini, com extração textual local para DOCX e XLSX.
- Registra página, trecho, confiança, provedor, modelo e estado de revisão de cada informação.
- Bloqueia aplicação automática: fatos precisam ser aprovados e conflitos precisam ser resolvidos ou justificados.
- Exige revisão individual para domínio médico sensível e aplica a política protegida de dados.
- Adiciona cadastro ou vínculo da empresa, estrutura inicial e criação idempotente de Trabalhos SST.
- Não sobrescreve automaticamente campos existentes da empresa.
- Adiciona central de importações, upload em lote, revisão, aprovação, rejeição, conflitos, nova tentativa e aplicação.
- Adiciona o job `LEGACY_ANALYZE_DOCUMENT` ao Worker e a feature flag `FEATURE_LEGACY_IMPORTS`.
- Total local: 123 testes automatizados aprovados.

## 1.2.0-checkpoint.10.2

### Copiloto operacional e ferramentas internas

- Adiciona central persistente de conversas do Copiloto Operacional.
- Adiciona catálogo fechado de ferramentas de leitura e escrita, sem SQL, shell ou acesso genérico ao banco.
- Adiciona consulta de empresas, estrutura, Trabalhos SST e pendências por comandos.
- Adiciona criação controlada de Trabalho SST, unidade, setor, GHE, função, posto e vistoria.
- Adiciona atualização de requisitos com dispensa classificada como ação crítica.
- Aplica RBAC, isolamento por tenant e validação dos vínculos estruturais antes de cada execução.
- Implementa modos Assistente, Copiloto e Autonomia Supervisionada no orquestrador.
- Adiciona aprovação, rejeição, execução idempotente, registro de falhas e auditoria.
- Vincula ferramentas a ChangeSets e implementa desfazer seguro por arquivamento, desativação ou restauração.
- Persiste mensagens, resultados de ferramentas e consumo de tokens.
- Limita cada mensagem a três ciclos e oito ferramentas por ciclo.
- Adiciona a feature flag `FEATURE_AI_COPILOT` e documentação de homologação.
- Total local: 131 testes automatizados aprovados.


## 1.2.0-checkpoint.10.3

### Experiência principal, campo e multimodal

- Adiciona a central “O que deseja fazer hoje?” com atalhos para trabalhos, importação, campo e Copiloto.
- Adiciona visitas técnicas vinculadas à empresa, Trabalho SST, vistoria e etapas do workflow.
- Adiciona checklists de campo adaptados a AET, PGR, PCMSO, LTCAT e higiene ocupacional.
- Adiciona captura mobile-first de fotografia, áudio, vídeo, documentos, notas e medições.
- Vincula evidências a setor, GHE, função e posto, com artefato reutilizável no Trabalho SST.
- Adiciona geolocalização explícita pelo navegador, sem coleta automática.
- Adiciona análise assíncrona pelo Worker com estados, retentativa, confiança e revisão humana.
- Proíbe a análise de inventar medições, diagnósticos ou conclusões legais.
- Adiciona anexos multimodais persistentes no Copiloto, com limite de quantidade/tamanho e confirmação de dados pessoais.
- Protege downloads por permissões específicas de trabalho e vistoria.
- Mantém todos os recursos desativados por feature flags até homologação.
- Total local: 141 testes automatizados aprovados.


## 1.2.0-checkpoint.10.9

### Universidade Corporativa, Treinamentos e Competências

- Adiciona programa pedagógico vinculado ao Trabalho SST.
- Adiciona cursos versionados e imutáveis após publicação.
- Adiciona módulos, aulas, materiais privados, links externos e conteúdo estruturado.
- Adiciona portal individual do aluno com token temporário armazenado somente como hash.
- Adiciona heartbeat de tempo ativo, progresso e logs de acesso sem fabricar duração estimada.
- Adiciona provas objetivas determinísticas, pesos, nota mínima e limite de tentativas.
- Adiciona revisão humana obrigatória para questões discursivas.
- Adiciona avaliações práticas, turmas, aulas ao vivo, presença e assinaturas.
- Adiciona trilhas e regras por função, GHE, risco, exposição e requisito legal.
- Vincula matrículas e sessões ao programa correto para separar ciclos e trabalhos.
- Adiciona certificados verificáveis, validade, revogação e invalidação de competências.
- Adiciona matriz de competências por trabalhador, função, GHE e curso.
- Adiciona auditoria determinística e ferramentas consultivas do Copiloto.
- Mantém quatro feature flags desativadas por padrão.
- Total local: 242 testes automatizados aprovados.

## 1.2.0-checkpoint.10.11

### Release Candidate Comercial e Homologação Controlada

- Adiciona baseline não destrutiva e modos `bootstrap`/`migrate` para o Prisma.
- Adiciona gates de produção para HTTPS, migrations e storage persistente.
- Adiciona painel de prontidão com Worker, jobs, backups, restauração, incidentes, cobrança e eSocial.
- Adiciona liveness e healthcheck versionados.
- Implementa checkout Asaas e Mercado Pago no servidor.
- Implementa autenticação específica dos webhooks, prevenção de replay, idempotência, fila e consulta autoritativa do pagamento.
- Implementa transporte mTLS do eSocial somente para lote XML previamente assinado.
- Adiciona anexo protegido do lote assinado com auditoria por hash e tamanho.
- Amplia o CI com auditoria crítica de dependências, drift, SQL de instalação limpa, SBOM, E2E e artefatos.
- Adiciona drill criptográfico e runbooks de deploy, go-live, backup/restauração e incidentes.
- Total local: 283 testes automatizados aprovados.
- Estado: release candidate; produção depende de homologação externa no staging, sandbox do gateway e ambiente restrito do eSocial.
