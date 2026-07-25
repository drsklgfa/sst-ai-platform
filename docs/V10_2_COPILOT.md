# Checkpoint 10.2 — Copiloto Operacional e Ferramentas Internas

## Objetivo

Transformar a fundação de IA dos checkpoints 10.0 e 10.1 em uma interface operacional capaz de consultar e executar funções reais da plataforma sem acesso genérico ao banco de dados.

## Princípio de segurança

A IA não clica livremente no site, não executa SQL e não recebe uma chave administrativa irrestrita. Ela recebe um catálogo fechado de ferramentas. Cada chamada passa por:

1. validação do nome e dos argumentos;
2. autorização RBAC do usuário autenticado;
3. isolamento pelo `tenantId`;
4. validação dos vínculos entre empresa, unidade, setor e GHE;
5. política de autonomia e risco;
6. aprovação humana quando exigida;
7. auditoria;
8. `ChangeSet` e operação segura de desfazer, quando aplicável.

## Ferramentas liberadas no 10.2

### Somente leitura

- `search_companies`;
- `get_company_context`;
- `list_work_projects`;
- `check_work_project_pending`.

### Escrita controlada

- `create_work_project`;
- `create_establishment`;
- `create_sector`;
- `create_ghe`;
- `create_job_function`;
- `create_workstation`;
- `create_inspection`;
- `update_work_requirement`.

Não existe ferramenta genérica para SQL, shell, requisição HTTP arbitrária, exclusão irrestrita ou alteração direta de qualquer tabela.

## Modos de autonomia

### Assistente

Recebe apenas ferramentas de leitura. Pesquisa, organiza, verifica pendências e sugere próximos passos.

### Copiloto

Pode preparar ferramentas de escrita, mas toda ação mutável aguarda aprovação.

### Autonomia supervisionada

Consultas e ações de baixo risco podem ser executadas automaticamente. Ações de risco médio aguardam confirmação simples. Ações altas ou críticas sempre aguardam aprovação destacada.

A dispensa de requisito técnico (`WAIVED`) é classificada como crítica, exige justificativa e nunca é executada silenciosamente.

## Conversas persistentes

Cada `AIThread` guarda:

- consultoria;
- empresa opcional;
- Trabalho SST opcional;
- usuário criador;
- provedor;
- modelo;
- autonomia;
- mensagens;
- ferramentas executadas;
- aprovações;
- consumo registrado.

O contexto da empresa ou do trabalho é fixado na conversa para reduzir ambiguidades.

## Aprovações

Quando a política exige confirmação:

1. a ferramenta é validada;
2. um `AIToolExecution` é criado como `WAITING_APPROVAL`;
3. um `ChangeSet` registra o plano;
4. um `ApprovalRequest` apresenta resumo, risco e parâmetros;
5. o usuário aprova ou rejeita;
6. somente depois da aprovação a aplicação executa a regra real.

A rejeição cancela a execução e marca o `ChangeSet` como rejeitado.

## Desfazer

O 10.2 implementa rollback seguro para as ações criadas pelo copiloto:

- Trabalho SST: arquivamento lógico;
- unidade, setor, GHE, função e posto: desativação lógica;
- vistoria vazia: exclusão somente enquanto não possuir itens, evidências, cálculos ou riscos;
- requisito: restauração do status, justificativa e data anteriores.

O desfazer exige a mesma permissão necessária para a ferramenta original e gera auditoria.

## Idempotência e prevenção de duplicidade

- uma execução já concluída não roda novamente;
- aprovações decididas não podem ser reaplicadas;
- nomes duplicados ativos são rejeitados dentro do mesmo pai estrutural;
- relações são verificadas dentro da mesma empresa e consultoria;
- falhas ficam registradas e podem ser diagnosticadas sem simular sucesso.

## Orquestração

O orquestrador:

- carrega a configuração ativa do tenant;
- verifica capacidade de ferramentas;
- aplica limite diário de solicitações;
- persiste a mensagem do usuário;
- envia histórico recente ao provedor;
- permite no máximo três ciclos de ferramentas por mensagem;
- registra tokens por ciclo;
- executa ou prepara aprovações;
- adiciona resultados de ferramentas à conversa;
- produz resposta final em português.

Cálculos técnicos, medições, conclusões clínicas, assinatura e emissão oficial continuam fora da decisão livre da IA.

## Interface

Novas páginas:

- `/copilot`: central de conversas e criação de contexto;
- `/copilot/[id]`: chat, aprovações, execuções e alterações reversíveis.

O Trabalho SST também oferece acesso direto para iniciar uma conversa vinculada ao projeto.

## Feature flag

```env
FEATURE_AI_COPILOT=false
```

O módulo permanece invisível e inacessível até ser ativado explicitamente.

## Limites deste checkpoint

O 10.2 não inclui ainda:

- anexos diretamente no chat;
- voz;
- análise de fotos em tempo real;
- geração completa de documentos pelo copiloto;
- publicação automática de campanhas;
- envio de mensagens externas;
- campo offline.

Esses recursos usarão a mesma arquitetura de ferramentas e aprovações nos checkpoints seguintes.
