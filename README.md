# Plataforma de Segurança e Saúde do Trabalho

Aplicação web privada e multiempresa para a operação de uma consultoria de SST. O objetivo é cadastrar empresas clientes, executar campanhas e avaliações, produzir documentos técnicos, acompanhar planos de ação e disponibilizar resultados ao RH.

> Estado desta cópia: **Checkpoint 10.11 — Release Candidate Comercial e Homologação Controlada**. A base 9.11 e todos os checkpoints 10.x foram preservados. Recursos externos permanecem condicionados aos gates do staging, sandbox e ambiente restrito.

## Base existente

- Autenticação própria com Argon2id e sessões no PostgreSQL.
- Estrutura multiempresa e perfis de consultoria/cliente.
- Empresas, estabelecimentos, setores, GHEs, funções e contatos.
- Campanhas públicas anônimas e questionário mobile-first.
- Portal permanente do RH.
- Documentos, versões, snapshots, PDF, DOCX e XLSX.
- Matriz de risco, NIOSH, RULA, REBA e consolidação psicossocial.
- Plano de ação 5W2H, evidências, mensagens e notificações.
- Armazenamento local ou S3 compatível.
- Backups portáteis e Worker com fila PostgreSQL.
- Importação auditável de PGR, PCMSO, LTCAT, LI, LP, AET, avaliações, planilhas, imagens e documentos antigos.
- Copiloto persistente com consultas reais, ações controladas, aprovações, desfazer auditável e anexos multimodais.
- Coleta em campo mobile-first com fotos, voz, documentos, notas, medições, localização explícita e revisão de evidências.
- GRO/PGR contínuo com inventário por GHE, participação, psicossocial protegido, plano de ação e auditoria técnica.
- PCMSO integrado ao PGR com população ocupacional, matriz de exames, convocações, área médica segregada, ASO, relatório analítico, auditoria e rascunho S-2220.
- Fonte temporal única de exposições para LTCAT, PPP, S-2240, insalubridade e periculosidade, com períodos históricos, agentes, medições, controles, conclusões protegidas e auditoria.
- AEP e AET integradas ao Trabalho SST, com demanda, trabalho prescrito e real, participação, organização do trabalho, fatores físicos/cognitivos/psicossociais, métodos, diagnóstico, decisão de aprofundamento e auditoria.
- Higiene ocupacional integrada às exposições, com reconhecimento, planos de amostragem, métodos versionados, dados brutos, memória de cálculo, instrumentos, calibrações, movimentações, revisão e auditoria.
- Universidade corporativa com cursos versionados, portal individual do aluno, conteúdo protegido, logs de acesso, avaliações, prática, presença, certificados verificáveis, reciclagens e matriz de competências.
- Operação SST 360 com EPI/EPC, incidentes, investigação, CAT, permissões de trabalho, máquinas, produtos químicos, emergências, CIPA, contratadas e matriz de obrigações.
- Portal ampliado da empresa, fila versionada do eSocial, planos SaaS, assinaturas, faturas, consumo e webhooks de pagamento idempotentes.
- Docker, Docker Compose, Railway e GitHub Actions.

## Alterações consolidadas até o Checkpoint 10.11

- Correções de compilação, Prisma, seed, Docker e GitHub Actions do Checkpoint 1.
- Questionários versionados, campanhas agendadas, códigos anônimos, retomada e moderação do Checkpoint 4.
- Vistorias, evidências, NIOSH/RULA/REBA, inventário de riscos e plano 5W2H do Checkpoint 5.
- Modelos documentais versionados, snapshots imutáveis, auditoria pré-emissão, assinatura por revisão e liberação atômica do Checkpoint 6.
- Portal RH ampliado, central de mensagens, anexos, notas internas, notificações e comentários vinculados do Checkpoint 7.
- Retenção configurável, preservação legal, incidentes, auditoria, heartbeat do Worker e testes de integridade do Checkpoint 8.
- Typecheck offline gerado do schema, correções de transação/retenção, dependências de framework atualizadas e CI com smoke test real de Web e Worker do Checkpoint 9, a correção de renderização da central de mensagens do Checkpoint 9.1 a tentativa de formatação manual do Checkpoint 9.2 e a correção definitiva do Checkpoint 9.3, que executa o formatter oficial antes da validação.
- Permissões explícitas em todas as rotas internas de alteração.
- Perfis internos e do portal com política de menor privilégio.
- Administração da equipe interna com convite, suspensão e revogação de sessões.
- Administração dos acessos do RH com reativação e novo convite.
- Portal do cliente carrega somente documentos, ações, mensagens e evidências permitidos pelo perfil.
- Arquivos privados, backups e documentos oficiais possuem autorização contextual.
- Referências entre campanha/vistoria e GHE são validadas dentro da própria empresa.
- Dados cadastrais da empresa editáveis e auditados.
- Unidades, setores, GHEs, funções e postos com arquivamento lógico.
- Contatos editáveis, canal preferido e contato principal.
- Serviços contratados com valores, prazos, entregas e renovações.
- Painel com alertas comerciais e operacionais.
- Backup portátil atualizado para os novos cadastros.
- Checkpoint 10.0: Trabalhos SST, workflows configuráveis, pendências, aprovações, ChangeSets, rastreio de IA, OpenAI/Gemini e ativação gradual.
- Checkpoint 10.1: lotes de documentos antigos, preservação por hash, análise multimodal, extração com página/trecho/confiança, conflitos entre fontes, revisão humana e criação idempotente de empresa, estrutura e Trabalhos SST.
- Checkpoint 10.2: Copiloto Operacional, catálogo fechado de ferramentas, RBAC, isolamento por tenant, aprovações por risco, execução auditada e ChangeSets reversíveis.
- Checkpoint 10.3: central “O que deseja fazer hoje?”, visitas técnicas, checklist por serviço, câmera, áudio, documentos, medições, geolocalização explícita, análise assíncrona e anexos multimodais do Copiloto.
- Checkpoint 10.4: GRO/PGR contínuo, inventário rastreável por GHE, avaliação determinística inicial e residual, participação dos trabalhadores, consolidação psicossocial protegida, geração de ações, auditoria de completude e ferramentas PGR do Copiloto.
- Checkpoint 10.5: PCMSO integrado ao PGR, trabalhadores protegidos, prestadores e médicos, catálogo e matriz de exames, convocações, ASO restrito, relatório analítico agregado, auditoria, logs de acesso médico e rascunho S-2220 com CNPJ alfanumérico.
- Checkpoint 10.6: fonte temporal única de exposições, LTCAT, PPP, S-2240, insalubridade e periculosidade, com períodos históricos, medições, EPC/EPI, conclusões protegidas e auditoria.
- Checkpoint 10.7: AEP/AET completa, análise da atividade real, participação dos trabalhadores, organização do trabalho, fatores físicos, cognitivos e psicossociais, RULA/REBA/NIOSH determinísticos, achados, plano de ação e decisão de aprofundamento.
- Checkpoint 10.8: higiene ocupacional, estratégias de amostragem, métodos e versões, cálculos determinísticos, dados brutos, memória de cálculo, instrumentos, calibrações, movimentações, integração com exposições e auditoria.
- Checkpoint 10.9: universidade corporativa, cursos versionados, portal do aluno, aulas, materiais protegidos, heartbeat, avaliações objetivas e discursivas, prática, presença, trilhas, regras, certificados e competências.
- Checkpoint 10.10: Operação SST 360, EPI/EPC, incidentes e CAT, permissões de trabalho, máquinas, produtos químicos, emergências, CIPA, contratadas, obrigações legais, portal ampliado, fila eSocial, planos SaaS, assinaturas, faturas, consumo e webhooks.
- Checkpoint 10.11: baseline de migrations, gates de produção, painel de prontidão, checkout Asaas/Mercado Pago, autenticação específica de webhooks, processamento assíncrono, transporte eSocial de lote previamente assinado, smoke E2E, auditoria de dependências, SBOM e drill de backup/restauração.
- Total atual: 283 testes automatizados aprovados.

Consulte `docs/MASTER_BLUEPRINT_V10.md`, `docs/V10_FOUNDATION.md`, `docs/V10_LEGACY_IMPORTS.md`, `docs/V10_2_COPILOT.md`, `docs/V10_3_FIELD_MULTIMODAL.md`, `docs/V10_3_DEPLOYMENT.md`, `docs/V10_4_PGR_GRO_PSYCHOSOCIAL.md`, `docs/V10_4_DEPLOYMENT.md`, `docs/V10_5_PCMSO_OCCUPATIONAL_HEALTH.md`, `docs/V10_5_DEPLOYMENT.md`, `docs/V10_6_LTCAT_PPP_LI_LP.md`, `docs/V10_6_DEPLOYMENT.md`, `docs/V10_7_AEP_AET_ERGONOMICS.md`, `docs/V10_7_DEPLOYMENT.md`, `docs/V10_8_HYGIENE_INSTRUMENTS.md`, `docs/V10_8_DEPLOYMENT.md`, `docs/V10_9_TRAINING_UNIVERSITY.md`, `docs/V10_9_DEPLOYMENT.md`, `docs/V10_10_OPERATIONS_COMMERCIAL.md`, `docs/V10_10_DEPLOYMENT.md`, `docs/V10_11_DEPLOYMENT.md`, `docs/COMMERCIAL_GO_LIVE_CHECKLIST.md`, `docs/BACKUP_RESTORE_RUNBOOK.md`, `docs/INCIDENT_RESPONSE_RUNBOOK.md`, `CHANGELOG.md`, `VALIDATION_REPORT.md`, `docs/CI_AND_HOMOLOGATION.md`, `docs/DOCUMENTS.md`, `docs/COMMUNICATION.md` e `docs/SECURITY_OPERATIONS.md` para os detalhes e o estado real das validações.

## Início local

1. Copie `.env.example` para `.env`.
2. Substitua `AUTH_SECRET` e `FILE_ENCRYPTION_KEY` por valores aleatórios.
3. Preencha as variáveis `SEED_*` com os dados da sua consultoria e do administrador inicial.
4. Suba o PostgreSQL:

```bash
docker compose up -d postgres
```

5. Instale as dependências e prepare o banco:

```bash
npm install
npm run preflight
npm run preflight:seed
DB_SCHEMA_MODE=bootstrap npm run db:deploy
npx prisma migrate resolve --applied 20260723000000_existing_schema_baseline
npm run db:migrate
npm run db:seed
```

6. Inicie Web e Worker em terminais separados:

```bash
npm run dev
npm run worker
```

7. Acesse `http://localhost:3000` e entre com o e-mail e a senha definidos em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

## Railway

Use quatro componentes no mesmo projeto:

- PostgreSQL;
- Web usando o `Dockerfile` sem Start Command personalizado;
- Worker usando a mesma imagem e o comando `npm run worker`;
- Bucket privado S3 compatível.

No primeiro bootstrap do Web, use `DB_SCHEMA_MODE=bootstrap`; depois altere para `DB_SCHEMA_MODE=migrate`. No Worker, use sempre `DB_SCHEMA_MODE=none`. Use `/railway.web.toml` e `/railway.worker.toml`.
Defina `APP_URL` com o domínio público HTTPS do serviço Web. Redirecionamentos de autenticação e formulários usam essa origem canônica e nunca devem apontar para `0.0.0.0`, `localhost` ou a porta interna do contêiner.

O seed deve ser executado uma única vez no shell do serviço Web, após configurar as variáveis `SEED_*`.

Consulte `docs/RAILWAY.md` para o roteiro completo.

## Segurança operacional

- Nunca publique `.env`, chaves, senhas ou credenciais do Bucket.
- Não reutilize a chave de exemplo de `.env.example` em produção.
- Use armazenamento S3 privado em produção.
- Mantenha IA e e-mail externos desativados enquanto não estiverem configurados.
- Cadastre empresas reais somente depois que a versão final passar por toda a validação e pelo teste de aceitação.

## Estrutura

- `src/app`: páginas e APIs;
- `src/domain`: regras técnicas, relatórios e backups;
- `src/lib`: autenticação, banco, storage, integrações e utilitários;
- `src/worker`: fila e processadores;
- `prisma`: schema e seed;
- `tests`: testes automatizados;
- `docker`: inicialização da imagem;
- `docs`: implantação e operação.
