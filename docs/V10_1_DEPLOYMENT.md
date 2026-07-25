# Implantação segura — Checkpoint 10.1

## Pré-requisitos

- Checkpoint 10.0 já implantado ou schema 9.11 compatível com atualização aditiva;
- Web e Worker usando o mesmo repositório;
- PostgreSQL e Bucket privados;
- backup do banco e do Bucket realizado antes da sincronização;
- provedor OpenAI ou Gemini configurado apenas no servidor.

## Flags

```env
FEATURE_V10_WORKS=false
FEATURE_AI_SETTINGS=false
FEATURE_LEGACY_IMPORTS=false
```

Faça o primeiro deploy com todas em `false`. Depois:

1. valide login, empresas, campanhas, documentos e Worker;
2. ative `FEATURE_V10_WORKS=true`;
3. ative `FEATURE_AI_SETTINGS=true` e teste a conexão;
4. ative `FEATURE_LEGACY_IMPORTS=true` somente no staging;
5. execute o roteiro de aceitação de `docs/V10_LEGACY_IMPORTS.md`;
6. mantenha o módulo desativado em produção até aprovar o teste com documentos fictícios ou anonimizados.

## Banco

O Checkpoint 10.1 adiciona quatro models, cinco enums e uma ligação opcional entre `WorkProject` e o lote de importação. As mudanças são aditivas.

A base atual ainda usa `prisma db push` no entrypoint do Web. A migração para `prisma migrate deploy` deve ser feita somente após criar uma baseline do PostgreSQL real e validar a restauração no staging.

## Worker

O novo tipo de job é:

```text
LEGACY_ANALYZE_DOCUMENT
```

O Worker precisa compartilhar:

- `DATABASE_URL`;
- configuração do Bucket;
- `FILE_ENCRYPTION_KEY`;
- acesso às configurações de IA criptografadas no banco.

## Rollback

1. definir `FEATURE_LEGACY_IMPORTS=false`;
2. aguardar jobs em execução terminarem ou cancelá-los no banco de forma controlada;
3. voltar Web e Worker para a tag anterior;
4. manter as tabelas novas sem uso;
5. restaurar banco ou Bucket somente se houver evidência de corrupção, não apenas para remover tabelas aditivas.
