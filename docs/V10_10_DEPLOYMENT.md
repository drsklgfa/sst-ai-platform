# Implantação — Checkpoint 10.10

## Princípio

Faça o primeiro deploy com todas as flags novas desativadas. Gere e revise uma migration sobre uma cópia recente do banco real. Não aplique alterações destrutivas e não substitua o histórico de migrations por `prisma db push` depois da baseline controlada.

## Feature flags

```env
FEATURE_OPERATIONAL_SST=false
FEATURE_EPI_EPC=false
FEATURE_INCIDENTS_CAT=false
FEATURE_WORK_PERMITS=false
FEATURE_MACHINES_NR12=false
FEATURE_CHEMICALS=false
FEATURE_EMERGENCY_CIPA=false
FEATURE_CONTRACTORS=false
FEATURE_CLIENT_PORTAL_PLUS=false
FEATURE_ESOCIAL_TRANSMISSION=false
FEATURE_BILLING=false
```

## Pagamentos

```env
PAYMENT_PROVIDER=disabled
PAYMENT_WEBHOOK_SECRET=
ASAAS_API_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
BILLING_CURRENCY=BRL
```

- `PAYMENT_WEBHOOK_SECRET` deve possuir pelo menos 24 caracteres.
- Não coloque segredos no navegador, logs ou auditoria.
- O endpoint de webhook possui rate limit, assinatura e idempotência, mas a convenção definitiva de assinatura deve ser adaptada e testada com o provedor escolhido.
- Use `manual` até a criação de cobrança e os webhooks reais estarem homologados.

## Ordem de ativação no staging

1. `FEATURE_OPERATIONAL_SST` — programa, panorama e auditoria;
2. `FEATURE_EPI_EPC` — catálogo, estoque e transações;
3. `FEATURE_INCIDENTS_CAT` — ocorrências e investigação;
4. `FEATURE_WORK_PERMITS` — emissão, aprovação e encerramento;
5. `FEATURE_MACHINES_NR12` e `FEATURE_CHEMICALS`;
6. `FEATURE_EMERGENCY_CIPA` e `FEATURE_CONTRACTORS`;
7. `FEATURE_CLIENT_PORTAL_PLUS` — solicitações do cliente;
8. `FEATURE_BILLING` com provedor manual;
9. `FEATURE_ESOCIAL_TRANSMISSION` somente depois da integração oficial completa.

## Aceite mínimo operacional

- isolamento entre consultorias e empresas;
- EPI bloqueado por CA/estoque/treinamento/adequação;
- ocorrência sem alteração silenciosa de obrigação;
- investigação e PT com aprovação separada;
- PT vencida ou incompleta impedida de autorização;
- máquina bloqueada impedida de liberação operacional;
- químico sem FDS visível na auditoria;
- obrigações vencidas e contratadas não conformes sinalizadas;
- portal sem acesso a dados de outra empresa;
- auditoria e ChangeSets preservados.

## Aceite mínimo comercial

- planos e assinaturas isolados por tenant;
- limites e consumo determinísticos;
- período mensal de fim de mês correto;
- transições de fatura protegidas;
- webhooks inválidos rejeitados;
- evento externo duplicado idempotente;
- inadimplência não apaga dados do cliente;
- exportação e cancelamento preservam histórico.

## eSocial

Antes de ativar transmissão, implementar e homologar:

- certificado e assinatura;
- autenticação oficial;
- ambiente restrito;
- protocolo e consulta;
- retificação e exclusão;
- tratamento de retornos e rejeições;
- reconciliação com S-2210, S-2220 e S-2240 já preparados.

Até lá, a fila serve para preparação, validação e rastreabilidade, não como prova de transmissão.

## Rollback funcional

Desative todas as flags do 10.10. Os dados permanecem preservados. Reverter o código não deve excluir tabelas ou registros; uma correção posterior pode reativá-los.

## Checkpoint seguinte

O 10.11 deve realizar migrations reais, CI/Railway staging, integrações externas, E2E, carga, recuperação, pentest, privacidade, contratos e homologação comercial final.
