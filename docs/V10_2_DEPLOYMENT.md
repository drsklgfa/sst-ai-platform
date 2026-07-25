# Implantação segura — Checkpoint 10.2

## Pré-requisitos

- Checkpoint 10.1 já implantado e estável;
- backup do PostgreSQL e do Bucket;
- ambiente Railway de staging;
- OpenAI ou Gemini cadastrado no painel;
- capacidade `Ferramentas` habilitada no provedor;
- pelo menos um usuário interno com `work.manage`.

## Variáveis

```env
FEATURE_V10_WORKS=true
FEATURE_AI_SETTINGS=true
FEATURE_LEGACY_IMPORTS=true
FEATURE_AI_COPILOT=false
```

Implante inicialmente com `FEATURE_AI_COPILOT=false`.

## Alterações de banco

O schema torna opcionais os vínculos de `ChangeSet` e `ApprovalRequest` com `WorkProject`, permitindo conversas gerais por empresa. Também adiciona o vínculo opcional `changeSetId` em `AIToolExecution`.

As alterações são aditivas ou de relaxamento de nulabilidade. O projeto continua usando o procedimento de sincronização já homologado na base atual. A migração definitiva para `prisma migrate deploy` depende da baseline do banco real.

## Sequência no staging

1. subir o código com todas as flags anteriores preservadas;
2. executar sincronização do schema pelo fluxo atual;
3. validar login, Web, Worker, empresas, documentos e importações;
4. confirmar o painel de IA e testar a conexão;
5. marcar capacidade de ferramentas no provedor;
6. definir `FEATURE_AI_COPILOT=true`;
7. criar conversa sem empresa e testar pesquisa;
8. criar conversa vinculada a empresa e consultar estrutura;
9. usar modo Copiloto e preparar criação de setor;
10. rejeitar uma aprovação e confirmar cancelamento;
11. aprovar outra ação e confirmar auditoria;
12. desfazer a alteração e confirmar arquivamento/desativação lógica;
13. tentar acessar ID de outro tenant em ambiente de teste e confirmar bloqueio;
14. testar limite diário de solicitações;
15. repetir smoke test de Web e Worker.

## Casos mínimos de aceitação

- Assistente não recebe ferramentas mutáveis;
- Copiloto não executa escrita antes da aprovação;
- autonomia supervisionada executa somente o que a política permite;
- dispensa de requisito exige justificativa e aprovação crítica;
- execução aprovada não roda duas vezes;
- ação rejeitada não altera cadastro;
- ferramenta não acessa empresa de outro tenant;
- desfazer não remove vistoria que já recebeu dados;
- todos os eventos aparecem na auditoria.

## Rollback

1. definir `FEATURE_AI_COPILOT=false`;
2. manter as tabelas e registros criados;
3. voltar Web e Worker para a tag 10.1, se necessário;
4. não excluir `AIThread`, `AIToolExecution`, `ApprovalRequest` ou `ChangeSet`;
5. restaurar banco somente após diagnóstico e teste de restauração.

Desativar a flag remove o acesso ao copiloto sem interromper a operação manual, os Trabalhos SST ou a importação de acervo.
