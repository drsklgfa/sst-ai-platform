# Implantação — Checkpoint 10.11 Release Candidate Comercial

## Objetivo

O Checkpoint 10.11 fecha os mecanismos que faltavam para uma implantação controlada:

- baseline do Prisma e migrações posteriores por `prisma migrate deploy`;
- gates de produção no preflight e no painel de homologação;
- CI com auditoria de dependências, drift, build, Docker, Web, Worker, E2E, SBOM e artefatos;
- checkout e webhooks específicos de Asaas e Mercado Pago;
- fila assíncrona e idempotente de pagamentos;
- transporte mTLS de lote eSocial previamente assinado;
- teste criptográfico de backup/restauração;
- healthchecks com versão da release.

Esta cópia é um **release candidate**. Ela somente pode ser marcada como produção homologada depois que os passos externos abaixo forem executados no GitHub Actions e no Railway staging com credenciais reais de sandbox.

## Variáveis comuns

```env
DEPLOY_ENVIRONMENT=staging
DB_SCHEMA_MODE=bootstrap
RELEASE_VERSION=1.2.0-checkpoint.10.11
APP_URL=https://DOMINIO-STAGING
SERVICE_ROLE=web
```

No Worker:

```env
SERVICE_ROLE=worker
DB_SCHEMA_MODE=none
```

Depois que a baseline estiver adotada e verificada no banco de staging e produção, o Web deve usar:

```env
DEPLOY_ENVIRONMENT=production
DB_SCHEMA_MODE=migrate
```

Produção bloqueia `APP_URL` sem HTTPS, storage local e modo de banco diferente de `migrate`.

## Adoção da baseline no banco existente

A migration `20260723000000_existing_schema_baseline` é deliberadamente não destrutiva. Ela registra que o schema existente foi adotado como ponto inicial.

### Staging baseado em cópia recente da produção

1. Faça backup do PostgreSQL e do Bucket.
2. Restaure a cópia em staging.
3. Configure o Web temporariamente com `DB_SCHEMA_MODE=bootstrap`.
4. Inicie o Web uma única vez.
5. Confirme nos logs:
   - `prisma db push` compatibilizou a base;
   - a baseline foi marcada como aplicada;
   - `prisma migrate deploy` terminou sem falha.
6. Altere o Web para `DB_SCHEMA_MODE=migrate`.
7. Reinicie Web e Worker.
8. Execute o checklist comercial e o teste de restauração.

O Worker nunca deve aplicar schema.

### Banco novo

Para um banco vazio, use `bootstrap` apenas na primeira inicialização. O artefato `artifacts/fresh-install.sql`, produzido pelo CI com `prisma migrate diff`, deve ser preservado em cada release para auditoria e recuperação.

## Asaas

```env
FEATURE_BILLING=true
PAYMENT_PROVIDER=asaas
PAYMENT_ENVIRONMENT=sandbox
ASAAS_API_KEY=...
ASAAS_WEBHOOK_TOKEN=TOKEN-ALEATORIO-DE-32-A-255-CARACTERES
```

Endpoint do webhook:

```text
https://SEU-DOMINIO/api/public/payments/webhook/asaas
```

Regras implementadas:

- token recebido em `asaas-access-token`;
- criação da cobrança no servidor;
- associação por `providerInvoiceId` e referência externa;
- confirmação do estado consultando a API do provedor;
- processamento pelo Worker;
- idempotência por evento externo;
- retentativas da fila.

A assinatura deve ser testada primeiro no sandbox. Somente depois altere `PAYMENT_ENVIRONMENT=production`.

## Mercado Pago

```env
FEATURE_BILLING=true
PAYMENT_PROVIDER=mercado_pago
PAYMENT_ENVIRONMENT=sandbox
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_WEBHOOK_SECRET=...
```

Endpoint:

```text
https://SEU-DOMINIO/api/public/payments/webhook/mercado-pago
```

Regras implementadas:

- validação de `x-signature`;
- uso de `x-request-id`, `data.id` e timestamp;
- tolerância de replay;
- preferência de checkout criada no servidor;
- chave de idempotência por fatura;
- consulta autoritativa do pagamento antes de atualizar a fatura;
- processamento assíncrono no Worker.

## eSocial

```env
FEATURE_ESOCIAL_TRANSMISSION=true
ESOCIAL_TRANSPORT_MODE=external_signed_xml
ESOCIAL_PFX_BASE64=...
ESOCIAL_PFX_PASSPHRASE=...
ESOCIAL_RESTRICTED_ENDPOINT=https://...
ESOCIAL_PRODUCTION_ENDPOINT=https://...
```

A plataforma **não fabrica assinatura XMLDSig**. Antes do envio, o evento precisa receber um lote XML já assinado pelo componente/provedor de assinatura escolhido.

Fluxo:

1. preparar e validar o evento S-2210, S-2220 ou S-2240;
2. gerar o lote conforme o leiaute vigente;
3. assinar externamente o XML;
4. anexar o lote assinado via `PUT /api/esocial/{id}/signed-batch`;
5. enfileirar via `POST /api/esocial/{id}/enqueue`;
6. o Worker transmite por HTTPS/mTLS usando o PFX;
7. a resposta, recibo, rejeição e retentativa ficam registrados.

A auditoria do anexo registra apenas SHA-256, tamanho, usuário e estado. O XML não é copiado para logs de auditoria.

A ativação inicial deve usar exclusivamente o ambiente restrito. Produção somente depois de eventos fictícios aceitos e conferidos por profissional responsável.

## Painel de homologação

Acesse:

```text
/settings/release
```

O painel bloqueia o lançamento quando identifica, entre outros:

- URL de produção sem HTTPS;
- banco fora de migrations;
- armazenamento local em produção;
- Worker ausente ou desatualizado;
- falhas acumuladas na fila;
- ausência de backup recente;
- ausência de teste recente de restauração;
- incidente crítico aberto;
- gateway habilitado sem configuração;
- eSocial habilitado sem transporte e certificado.

## Rollback

1. Desative as feature flags de cobrança e eSocial.
2. Mantenha o Worker ativo para concluir jobs seguros ou cancele os jobs ainda não iniciados.
3. Volte o código para a tag anterior.
4. Não execute migration destrutiva.
5. Quando necessário, restaure banco e Bucket a partir dos backups pareados.
6. Registre o incidente e execute novo teste de restauração antes de reabrir a operação.

## Portões de go-live

- GitHub Actions integralmente verde;
- migration e drift verificados em staging;
- `/api/health/live` e `/api/health` saudáveis;
- smoke E2E aprovado;
- backup recente;
- teste de restauração aprovado;
- S3 privado validado;
- isolamento entre consultorias testado;
- sandbox do gateway aprovado, incluindo webhook duplicado e inválido;
- ambiente restrito do eSocial aprovado, caso o módulo seja contratado;
- termos, privacidade, contrato e suporte publicados;
- primeiro cliente piloto revisado manualmente.
