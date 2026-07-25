# Implantação segura do Checkpoint 10.0

> Documento histórico do Checkpoint 10.0. Para implantar o pacote atual, use `docs/V10_3_DEPLOYMENT.md`.

## Regra principal

Não ativar diretamente na produção. Usar primeiro uma branch e um ambiente Railway de staging.

## Variáveis novas

```env
FEATURE_V10_WORKS=false
FEATURE_AI_SETTINGS=false
```

Com ambas em `false`, a aplicação mantém a experiência anterior e não exibe os novos menus.

## Sequência recomendada

1. Criar branch `v10-ai-copilot`.
2. Duplicar o ambiente Railway para staging.
3. Fazer backup do PostgreSQL e do Bucket.
4. Implantar o checkpoint com as flags desativadas.
5. Confirmar Web, Worker, login, arquivos e jobs existentes.
6. Definir `FEATURE_V10_WORKS=true` no staging.
7. Criar trabalhos fictícios dos oito fluxos iniciais.
8. Definir `FEATURE_AI_SETTINGS=true` no staging.
9. Cadastrar uma chave de teste e usar o botão `Testar conexão`.
10. Repetir a suíte de homologação antes de qualquer merge na produção.

## Banco de dados

A implantação atual continua usando `prisma db push` pelo entrypoint do Web, como no Checkpoint 9.11. As alterações do 10.0 são aditivas: novos enums, tabelas, índices e o valor `OPENAI` no enum de integrações.

A migração definitiva para `prisma migrate deploy` deve ser feita com baseline do banco real e teste de restauração. Não criar uma baseline fictícia sem comparar com o PostgreSQL de produção.

## Rollback

Como os novos recursos são isolados:

1. definir as duas feature flags como `false`;
2. voltar o Web e o Worker para a tag 9.11;
3. manter as tabelas novas sem uso, evitando exclusão destrutiva;
4. restaurar o banco somente se uma verificação demonstrar necessidade real.
