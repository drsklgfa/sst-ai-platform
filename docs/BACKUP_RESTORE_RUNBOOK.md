# Runbook de backup e restauração

## Escopo

Um backup comercial completo exige quatro componentes pareados:

1. código e tag da release;
2. PostgreSQL;
3. Bucket/objetos privados;
4. configuração versionada sem segredos.

O ZIP do checkpoint protege o código, mas não substitui backup do banco e dos arquivos dos clientes.

## Frequência recomendada

- banco: diário e antes de qualquer migration;
- Bucket: versionamento ou cópia incremental diária;
- checkpoint de código: em cada release;
- teste de restauração: mensal e antes do go-live.

## Procedimento

1. Registre `RELEASE_VERSION`, data e horário.
2. Pause operações críticas ou obtenha um ponto consistente.
3. Gere backup do PostgreSQL.
4. Gere inventário/cópia do Bucket.
5. Calcule hashes e salve o manifesto.
6. Copie os artefatos para local independente do projeto Railway.
7. Restaure em banco e Bucket isolados.
8. Suba Web e Worker com `DB_SCHEMA_MODE=migrate`.
9. Execute `/api/health`, smoke E2E e validações de arquivos.
10. Registre o resultado em `RecoveryTest`.

## Critérios de aprovação

- banco abre sem erro;
- quantidade de empresas e arquivos é coerente;
- hashes dos objetos conferem;
- login funciona;
- documento e evidência podem ser baixados;
- Worker publica heartbeat;
- nenhuma conexão aponta para produção.

## Falha de restauração

- não descarte o backup original;
- marque o teste como falho;
- abra incidente;
- identifique se a falha é banco, arquivos, segredo, versão ou migration;
- corrija e repita em um novo ambiente;
- bloqueie o lançamento enquanto não houver uma restauração aprovada.
