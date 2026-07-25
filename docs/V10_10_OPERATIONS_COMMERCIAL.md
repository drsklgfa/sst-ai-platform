# Checkpoint 10.10 — Operação SST 360, integrações, portais e cobrança

## Objetivo

Completar a camada operacional comum da plataforma e criar a fundação comercial do SaaS sem duplicar empresas, trabalhadores, riscos, exposições, ações, documentos ou permissões já existentes.

## Operação SST 360

O novo `OperationalSstProgram` pertence a uma empresa e a um Trabalho SST do tipo `OPERACAO_SST`. Ele agrega governança, EPI/EPC, ocorrências, atividades críticas, ativos, produtos químicos, emergências, CIPA, contratadas, obrigações e auditoria.

### EPI e EPC

- catálogo, CA, validade, estoque e ponto de reposição;
- entrega, devolução, troca, perda, dano e baixa;
- confirmação de orientação/treinamento e adequação ao trabalhador;
- bloqueio determinístico por CA vencido, falta de estoque ou validações ausentes;
- histórico auditável sem apagar transações anteriores.

### Acidentes, incidentes e CAT

- acidente, doença relacionada, incidente, quase acidente, condição insegura e dano material;
- severidade, afastamento, fatalidade, trabalhador e evidências;
- indicação determinística de CAT, S-2210, notificação imediata e investigação formal;
- investigação por cinco porquês, árvore de causas, barreiras ou método personalizado;
- aprovação da investigação separada do cadastro da ocorrência.

A plataforma sinaliza obrigações; não substitui a análise legal/profissional nem transmite a CAT neste checkpoint.

### Permissões de trabalho

- altura, espaço confinado, eletricidade, trabalho a quente, escavação, içamento, manutenção, produtos químicos e tipos personalizados;
- janela de validade, equipe, checklist, controles e medições;
- emissão e aprovação com permissões distintas;
- bloqueio quando checklist, controles, trabalhadores, medições ou aprovador estiverem incompletos.

### Máquinas, produtos químicos, emergências e CIPA

- inventário de máquinas, situação operacional, inspeção e bloqueio;
- produtos químicos com FDS, validade, incompatibilidades e controles;
- planos de emergência e simulados;
- ciclos de CIPA e situação do mandato;
- auditoria de lacunas e integração ao plano de ação.

### Contratadas e obrigações

- empresa contratada, documentos, trabalhadores liberados, integração e riscos compartilhados;
- pontuação determinística de conformidade;
- obrigações legais com responsáveis, evidências, vencimento, cumprimento ou dispensa justificada;
- portal da empresa com solicitações rastreáveis à consultoria.

## eSocial

O `EsocialEventQueue` fornece:

- S-2210, S-2220 e S-2240;
- ambiente restrito ou produção;
- payload versionado;
- validação determinística mínima;
- chave de idempotência;
- fila, tentativas, erros e estados controlados;
- cancelamento antes da aceitação.

A transmissão oficial não está implementada neste checkpoint. Certificado, assinatura, autenticação, envio, protocolo, consulta, retificação, exclusão e tratamento dos retornos oficiais serão homologados no Checkpoint 10.11. A feature flag permanece desativada.

## Comercialização do SaaS

### Planos e assinaturas

- planos mensais, anuais ou avulsos;
- período de teste;
- limites e franquias configuráveis;
- assinatura por consultoria;
- estados de teste, ativa, inadimplente, suspensa, cancelada ou expirada;
- períodos mensais com tratamento correto do último dia do mês.

### Faturas e uso

- rascunho, aberta, vencida, paga, reembolsada ou anulada;
- transições controladas;
- identificador externo do provedor;
- uso agregado por métrica, período e origem;
- franquias de empresas, usuários, armazenamento, IA, treinamentos e outros módulos.

### Pagamentos

- provedores preparados: manual, Asaas e Mercado Pago;
- segredo de webhook no servidor;
- assinatura HMAC com comparação segura;
- eventos idempotentes;
- atualização de fatura somente por transição válida.

O núcleo comercial está pronto, mas checkout, criação de cobrança no provedor, conciliação completa e regras específicas de assinatura de cada gateway ainda não foram conectados às APIs reais. Até a homologação, use `PAYMENT_PROVIDER=disabled` ou `manual`.

## IA e decisões críticas

O Copiloto recebe apenas:

- `get_operational_overview`;
- `run_operational_audit`.

Não existem ferramentas para aprovar PT, investigação, CAT, transmissão eSocial, conclusão legal ou pagamento.

## Resultado arquitetural

O Checkpoint 10.10 fecha a fundação modular prevista para a suíte total. Os módulos seguintes devem concentrar-se em integrações reais, migrações, testes E2E, segurança e homologação comercial, não em reconstrução do núcleo.
