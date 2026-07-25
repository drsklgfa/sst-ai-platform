# Plataforma de SeguranÃ§a e SaÃºde do Trabalho

[![CI](https://github.com/drsklgfa/sst-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/drsklgfa/sst-ai-platform/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/drsklgfa/sst-ai-platform/actions/workflows/pages.yml/badge.svg)](https://drsklgfa.github.io/sst-ai-platform/)

**Demo visual:** https://drsklgfa.github.io/sst-ai-platform/
AplicaÃ§Ã£o web privada e multiempresa para a operaÃ§Ã£o de uma consultoria de SST. O objetivo Ã© cadastrar empresas clientes, executar campanhas e avaliaÃ§Ãµes, produzir documentos tÃ©cnicos, acompanhar planos de aÃ§Ã£o e disponibilizar resultados ao RH.

> Estado desta cÃ³pia: **Checkpoint 10.11 â€” Release Candidate Comercial e HomologaÃ§Ã£o Controlada**. A base 9.11 e todos os checkpoints 10.x foram preservados. Recursos externos permanecem condicionados aos gates do staging, sandbox e ambiente restrito.

## Base existente

- AutenticaÃ§Ã£o prÃ³pria com Argon2id e sessÃµes no PostgreSQL.
- Estrutura multiempresa e perfis de consultoria/cliente.
- Empresas, estabelecimentos, setores, GHEs, funÃ§Ãµes e contatos.
- Campanhas pÃºblicas anÃ´nimas e questionÃ¡rio mobile-first.
- Portal permanente do RH.
- Documentos, versÃµes, snapshots, PDF, DOCX e XLSX.
- Matriz de risco, NIOSH, RULA, REBA e consolidaÃ§Ã£o psicossocial.
- Plano de aÃ§Ã£o 5W2H, evidÃªncias, mensagens e notificaÃ§Ãµes.
- Armazenamento local ou S3 compatÃ­vel.
- Backups portÃ¡teis e Worker com fila PostgreSQL.
- ImportaÃ§Ã£o auditÃ¡vel de PGR, PCMSO, LTCAT, LI, LP, AET, avaliaÃ§Ãµes, planilhas, imagens e documentos antigos.
- Copiloto persistente com consultas reais, aÃ§Ãµes controladas, aprovaÃ§Ãµes, desfazer auditÃ¡vel e anexos multimodais.
- Coleta em campo mobile-first com fotos, voz, documentos, notas, mediÃ§Ãµes, localizaÃ§Ã£o explÃ­cita e revisÃ£o de evidÃªncias.
- GRO/PGR contÃ­nuo com inventÃ¡rio por GHE, participaÃ§Ã£o, psicossocial protegido, plano de aÃ§Ã£o e auditoria tÃ©cnica.
- PCMSO integrado ao PGR com populaÃ§Ã£o ocupacional, matriz de exames, convocaÃ§Ãµes, Ã¡rea mÃ©dica segregada, ASO, relatÃ³rio analÃ­tico, auditoria e rascunho S-2220.
- Fonte temporal Ãºnica de exposiÃ§Ãµes para LTCAT, PPP, S-2240, insalubridade e periculosidade, com perÃ­odos histÃ³ricos, agentes, mediÃ§Ãµes, controles, conclusÃµes protegidas e auditoria.
- AEP e AET integradas ao Trabalho SST, com demanda, trabalho prescrito e real, participaÃ§Ã£o, organizaÃ§Ã£o do trabalho, fatores fÃ­sicos/cognitivos/psicossociais, mÃ©todos, diagnÃ³stico, decisÃ£o de aprofundamento e auditoria.
- Higiene ocupacional integrada Ã s exposiÃ§Ãµes, com reconhecimento, planos de amostragem, mÃ©todos versionados, dados brutos, memÃ³ria de cÃ¡lculo, instrumentos, calibraÃ§Ãµes, movimentaÃ§Ãµes, revisÃ£o e auditoria.
- Universidade corporativa com cursos versionados, portal individual do aluno, conteÃºdo protegido, logs de acesso, avaliaÃ§Ãµes, prÃ¡tica, presenÃ§a, certificados verificÃ¡veis, reciclagens e matriz de competÃªncias.
- OperaÃ§Ã£o SST 360 com EPI/EPC, incidentes, investigaÃ§Ã£o, CAT, permissÃµes de trabalho, mÃ¡quinas, produtos quÃ­micos, emergÃªncias, CIPA, contratadas e matriz de obrigaÃ§Ãµes.
- Portal ampliado da empresa, fila versionada do eSocial, planos SaaS, assinaturas, faturas, consumo e webhooks de pagamento idempotentes.
- Docker, Docker Compose, Railway e GitHub Actions.

## AlteraÃ§Ãµes consolidadas atÃ© o Checkpoint 10.11

- CorreÃ§Ãµes de compilaÃ§Ã£o, Prisma, seed, Docker e GitHub Actions do Checkpoint 1.
- QuestionÃ¡rios versionados, campanhas agendadas, cÃ³digos anÃ´nimos, retomada e moderaÃ§Ã£o do Checkpoint 4.
- Vistorias, evidÃªncias, NIOSH/RULA/REBA, inventÃ¡rio de riscos e plano 5W2H do Checkpoint 5.
- Modelos documentais versionados, snapshots imutÃ¡veis, auditoria prÃ©-emissÃ£o, assinatura por revisÃ£o e liberaÃ§Ã£o atÃ´mica do Checkpoint 6.
- Portal RH ampliado, central de mensagens, anexos, notas internas, notificaÃ§Ãµes e comentÃ¡rios vinculados do Checkpoint 7.
- RetenÃ§Ã£o configurÃ¡vel, preservaÃ§Ã£o legal, incidentes, auditoria, heartbeat do Worker e testes de integridade do Checkpoint 8.
- Typecheck offline gerado do schema, correÃ§Ãµes de transaÃ§Ã£o/retenÃ§Ã£o, dependÃªncias de framework atualizadas e CI com smoke test real de Web e Worker do Checkpoint 9, a correÃ§Ã£o de renderizaÃ§Ã£o da central de mensagens do Checkpoint 9.1 a tentativa de formataÃ§Ã£o manual do Checkpoint 9.2 e a correÃ§Ã£o definitiva do Checkpoint 9.3, que executa o formatter oficial antes da validaÃ§Ã£o.
- PermissÃµes explÃ­citas em todas as rotas internas de alteraÃ§Ã£o.
- Perfis internos e do portal com polÃ­tica de menor privilÃ©gio.
- AdministraÃ§Ã£o da equipe interna com convite, suspensÃ£o e revogaÃ§Ã£o de sessÃµes.
- AdministraÃ§Ã£o dos acessos do RH com reativaÃ§Ã£o e novo convite.
- Portal do cliente carrega somente documentos, aÃ§Ãµes, mensagens e evidÃªncias permitidos pelo perfil.
- Arquivos privados, backups e documentos oficiais possuem autorizaÃ§Ã£o contextual.
- ReferÃªncias entre campanha/vistoria e GHE sÃ£o validadas dentro da prÃ³pria empresa.
- Dados cadastrais da empresa editÃ¡veis e auditados.
- Unidades, setores, GHEs, funÃ§Ãµes e postos com arquivamento lÃ³gico.
- Contatos editÃ¡veis, canal preferido e contato principal.
- ServiÃ§os contratados com valores, prazos, entregas e renovaÃ§Ãµes.
- Painel com alertas comerciais e operacionais.
- Backup portÃ¡til atualizado para os novos cadastros.
- Checkpoint 10.0: Trabalhos SST, workflows configurÃ¡veis, pendÃªncias, aprovaÃ§Ãµes, ChangeSets, rastreio de IA, OpenAI/Gemini e ativaÃ§Ã£o gradual.
- Checkpoint 10.1: lotes de documentos antigos, preservaÃ§Ã£o por hash, anÃ¡lise multimodal, extraÃ§Ã£o com pÃ¡gina/trecho/confianÃ§a, conflitos entre fontes, revisÃ£o humana e criaÃ§Ã£o idempotente de empresa, estrutura e Trabalhos SST.
- Checkpoint 10.2: Copiloto Operacional, catÃ¡logo fechado de ferramentas, RBAC, isolamento por tenant, aprovaÃ§Ãµes por risco, execuÃ§Ã£o auditada e ChangeSets reversÃ­veis.
- Checkpoint 10.3: central â€œO que deseja fazer hoje?â€, visitas tÃ©cnicas, checklist por serviÃ§o, cÃ¢mera, Ã¡udio, documentos, mediÃ§Ãµes, geolocalizaÃ§Ã£o explÃ­cita, anÃ¡lise assÃ­ncrona e anexos multimodais do Copiloto.
- Checkpoint 10.4: GRO/PGR contÃ­nuo, inventÃ¡rio rastreÃ¡vel por GHE, avaliaÃ§Ã£o determinÃ­stica inicial e residual, participaÃ§Ã£o dos trabalhadores, consolidaÃ§Ã£o psicossocial protegida, geraÃ§Ã£o de aÃ§Ãµes, auditoria de completude e ferramentas PGR do Copiloto.
- Checkpoint 10.5: PCMSO integrado ao PGR, trabalhadores protegidos, prestadores e mÃ©dicos, catÃ¡logo e matriz de exames, convocaÃ§Ãµes, ASO restrito, relatÃ³rio analÃ­tico agregado, auditoria, logs de acesso mÃ©dico e rascunho S-2220 com CNPJ alfanumÃ©rico.
- Checkpoint 10.6: fonte temporal Ãºnica de exposiÃ§Ãµes, LTCAT, PPP, S-2240, insalubridade e periculosidade, com perÃ­odos histÃ³ricos, mediÃ§Ãµes, EPC/EPI, conclusÃµes protegidas e auditoria.
- Checkpoint 10.7: AEP/AET completa, anÃ¡lise da atividade real, participaÃ§Ã£o dos trabalhadores, organizaÃ§Ã£o do trabalho, fatores fÃ­sicos, cognitivos e psicossociais, RULA/REBA/NIOSH determinÃ­sticos, achados, plano de aÃ§Ã£o e decisÃ£o de aprofundamento.
- Checkpoint 10.8: higiene ocupacional, estratÃ©gias de amostragem, mÃ©todos e versÃµes, cÃ¡lculos determinÃ­sticos, dados brutos, memÃ³ria de cÃ¡lculo, instrumentos, calibraÃ§Ãµes, movimentaÃ§Ãµes, integraÃ§Ã£o com exposiÃ§Ãµes e auditoria.
- Checkpoint 10.9: universidade corporativa, cursos versionados, portal do aluno, aulas, materiais protegidos, heartbeat, avaliaÃ§Ãµes objetivas e discursivas, prÃ¡tica, presenÃ§a, trilhas, regras, certificados e competÃªncias.
- Checkpoint 10.10: OperaÃ§Ã£o SST 360, EPI/EPC, incidentes e CAT, permissÃµes de trabalho, mÃ¡quinas, produtos quÃ­micos, emergÃªncias, CIPA, contratadas, obrigaÃ§Ãµes legais, portal ampliado, fila eSocial, planos SaaS, assinaturas, faturas, consumo e webhooks.
- Checkpoint 10.11: baseline de migrations, gates de produÃ§Ã£o, painel de prontidÃ£o, checkout Asaas/Mercado Pago, autenticaÃ§Ã£o especÃ­fica de webhooks, processamento assÃ­ncrono, transporte eSocial de lote previamente assinado, smoke E2E, auditoria de dependÃªncias, SBOM e drill de backup/restauraÃ§Ã£o.
- Total atual: 283 testes automatizados aprovados.

Consulte `docs/MASTER_BLUEPRINT_V10.md`, `docs/V10_FOUNDATION.md`, `docs/V10_LEGACY_IMPORTS.md`, `docs/V10_2_COPILOT.md`, `docs/V10_3_FIELD_MULTIMODAL.md`, `docs/V10_3_DEPLOYMENT.md`, `docs/V10_4_PGR_GRO_PSYCHOSOCIAL.md`, `docs/V10_4_DEPLOYMENT.md`, `docs/V10_5_PCMSO_OCCUPATIONAL_HEALTH.md`, `docs/V10_5_DEPLOYMENT.md`, `docs/V10_6_LTCAT_PPP_LI_LP.md`, `docs/V10_6_DEPLOYMENT.md`, `docs/V10_7_AEP_AET_ERGONOMICS.md`, `docs/V10_7_DEPLOYMENT.md`, `docs/V10_8_HYGIENE_INSTRUMENTS.md`, `docs/V10_8_DEPLOYMENT.md`, `docs/V10_9_TRAINING_UNIVERSITY.md`, `docs/V10_9_DEPLOYMENT.md`, `docs/V10_10_OPERATIONS_COMMERCIAL.md`, `docs/V10_10_DEPLOYMENT.md`, `docs/V10_11_DEPLOYMENT.md`, `docs/COMMERCIAL_GO_LIVE_CHECKLIST.md`, `docs/BACKUP_RESTORE_RUNBOOK.md`, `docs/INCIDENT_RESPONSE_RUNBOOK.md`, `CHANGELOG.md`, `VALIDATION_REPORT.md`, `docs/CI_AND_HOMOLOGATION.md`, `docs/DOCUMENTS.md`, `docs/COMMUNICATION.md` e `docs/SECURITY_OPERATIONS.md` para os detalhes e o estado real das validaÃ§Ãµes.

## InÃ­cio local

1. Copie `.env.example` para `.env`.
2. Substitua `AUTH_SECRET` e `FILE_ENCRYPTION_KEY` por valores aleatÃ³rios.
3. Preencha as variÃ¡veis `SEED_*` com os dados da sua consultoria e do administrador inicial.
4. Suba o PostgreSQL:

```bash
docker compose up -d postgres
```

5. Instale as dependÃªncias e prepare o banco:

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
- Bucket privado S3 compatÃ­vel.

No primeiro bootstrap do Web, use `DB_SCHEMA_MODE=bootstrap`; depois altere para `DB_SCHEMA_MODE=migrate`. No Worker, use sempre `DB_SCHEMA_MODE=none`. Use `/railway.web.toml` e `/railway.worker.toml`.
Defina `APP_URL` com o domÃ­nio pÃºblico HTTPS do serviÃ§o Web. Redirecionamentos de autenticaÃ§Ã£o e formulÃ¡rios usam essa origem canÃ´nica e nunca devem apontar para `0.0.0.0`, `localhost` ou a porta interna do contÃªiner.

O seed deve ser executado uma Ãºnica vez no shell do serviÃ§o Web, apÃ³s configurar as variÃ¡veis `SEED_*`.

Consulte `docs/RAILWAY.md` para o roteiro completo.

## SeguranÃ§a operacional

- Nunca publique `.env`, chaves, senhas ou credenciais do Bucket.
- NÃ£o reutilize a chave de exemplo de `.env.example` em produÃ§Ã£o.
- Use armazenamento S3 privado em produÃ§Ã£o.
- Mantenha IA e e-mail externos desativados enquanto nÃ£o estiverem configurados.
- Cadastre empresas reais somente depois que a versÃ£o final passar por toda a validaÃ§Ã£o e pelo teste de aceitaÃ§Ã£o.

## Estrutura

- `src/app`: pÃ¡ginas e APIs;
- `src/domain`: regras tÃ©cnicas, relatÃ³rios e backups;
- `src/lib`: autenticaÃ§Ã£o, banco, storage, integraÃ§Ãµes e utilitÃ¡rios;
- `src/worker`: fila e processadores;
- `prisma`: schema e seed;
- `tests`: testes automatizados;
- `docker`: inicializaÃ§Ã£o da imagem;
- `docs`: implantaÃ§Ã£o e operaÃ§Ã£o.

