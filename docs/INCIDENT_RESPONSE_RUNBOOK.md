# Runbook de resposta a incidentes

## Severidade

- **Crítica:** exposição de dados, acesso entre tenants, indisponibilidade total, perda de banco/arquivos ou chave comprometida.
- **Alta:** módulo principal indisponível, fila travada, cobrança incorreta em escala ou envio externo incorreto.
- **Média/Baixa:** falha localizada com alternativa operacional.

## Resposta inicial

1. Registre o incidente e o horário.
2. Preserve logs e evidências sem copiar dados sensíveis desnecessários.
3. Desative a feature flag afetada.
4. Revogue ou rotacione credenciais comprometidas.
5. Bloqueie transmissões, webhooks ou ações irreversíveis quando aplicável.
6. Avalie impacto por tenant, empresa, trabalhador e período.
7. Acione responsáveis técnico, médico, segurança e jurídico conforme o caso.

## Contenção por domínio

- IA: desative provedor e autonomia.
- Cobrança: altere para `manual` ou `disabled`.
- eSocial: desative `FEATURE_ESOCIAL_TRANSMISSION`.
- Área médica: suspenda perfis e sessões afetados.
- Storage: revogue chaves e URLs assinadas.
- Banco: torne a aplicação somente leitura ou restaure em ambiente isolado.

## Recuperação

1. Corrija em branch e staging.
2. Execute a suíte, CI, smoke e teste de restauração.
3. Gere nova tag e checkpoint.
4. Reative gradualmente.
5. Reprocesse jobs idempotentes.
6. Confirme que nenhum evento externo foi duplicado.

## Encerramento

- causa raiz;
- dados e clientes afetados;
- linha do tempo;
- ações de contenção e correção;
- comunicação e obrigações legais avaliadas;
- prevenção de recorrência;
- aprovação do responsável.
