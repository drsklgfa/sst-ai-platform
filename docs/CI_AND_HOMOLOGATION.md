# CI, homologação e aprovação para produção

## Objetivo

O pipeline impede que uma versão seja tratada como pronta apenas porque os arquivos foram revisados. A aprovação exige dependências reais, Prisma Client, PostgreSQL, TypeScript, testes, build Next.js, imagem Docker e inicialização dos dois processos.

## Barreiras do GitHub Actions

1. Checkout do repositório.
2. Node.js 22.
3. Instalação das dependências com retentativas.
4. Cache do Next.js.
5. Validação das fontes, schema, preflights e typecheck offline.
6. `prisma format`, `prisma format --check`, `prisma validate` e `prisma generate`.
7. Criação do banco, adoção da baseline, migrations, seed, verificação de drift, SQL de instalação limpa e SBOM.
8. Typecheck real usando Prisma Client e tipos das dependências.
9. Testes automatizados.
10. Build de produção do Next.js.
11. Construção da imagem Docker.
12. Inicialização do Web e Worker na imagem construída.
13. Smoke E2E de health, headers, login e proteção cross-site.
14. Publicação de evidências de homologação.

A última etapa consulta `/api/health` e exige:

- Aplicação respondendo;
- Banco de dados saudável;
- Worker publicando heartbeat saudável.

## Typecheck offline

O comando:

```bash
npm run typecheck:offline
```

gera declarações auxiliares com os models e enums atuais do `schema.prisma`. Ele encontra erros locais mesmo quando o registro npm está temporariamente indisponível.

Essa validação não substitui:

```bash
npm run typecheck
```

O typecheck real continua obrigatório porque utiliza as declarações oficiais do Prisma, Next.js, React e demais dependências.

## Critério de homologação

Uma versão só pode seguir para Railway quando o GitHub Actions estiver totalmente verde. Na Railway, a homologação deve usar dados fictícios e confirmar:

- Login e seed inicial;
- Cadastro de empresa e estrutura ocupacional;
- Campanha e resposta anônima;
- Vistoria e cálculo;
- Risco e plano 5W2H;
- Documento, prévia, emissão e liberação;
- Portal RH, mensagem e evidência;
- Backup, download e teste de integridade;
- Web e Worker saudáveis no painel do sistema.

Empresas reais só devem ser cadastradas após esse teste de aceitação.


## Formatação oficial do Prisma

A etapa do Prisma executa primeiro `npx prisma format` usando exatamente a versão instalada no runner. Em seguida, executa `npx prisma format --check` para confirmar o resultado, e só então `validate` e `generate`. Isso não ignora a validação: elimina diferenças de estilo produzidas por edição manual e mantém as verificações reais bloqueantes.

## Rede da homologação Docker

A homologação da imagem usa uma rede Docker própria, com três contêineres:

- `sst-postgres-ci`;
- `sst-web-ci`;
- `sst-worker-ci`.

O Web escuta em `0.0.0.0:3000`, publica a porta no runner e aplica o schema no PostgreSQL isolado. O Worker só é iniciado depois que a aplicação e o banco estiverem saudáveis. Isso evita depender de `--network host`, do significado de `localhost` dentro do contêiner ou do hostname automático do runner.

Quando a homologação falha, o pipeline mostra o último código HTTP, o corpo do healthcheck, o estado dos contêineres e os logs de Web, Worker e PostgreSQL.


## Gates do Checkpoint 10.11

O CI também executa `npm audit` para vulnerabilidades críticas, o drill criptográfico de backup/restauração, `prisma migrate diff` para detectar drift e geração de SBOM CycloneDX. O lançamento comercial continua bloqueado se staging, pagamentos ou eSocial não forem homologados com as respectivas credenciais de teste.
