# Versão 10.0 — Fundação segura

## Objetivo

Adicionar a arquitetura definitiva da nova fase sem remover ou alterar o funcionamento dos módulos existentes do Checkpoint 9.11.

## Recursos implementados

- Central `WorkProject` para reunir empresa, serviço, etapas, requisitos, artefatos, decisões e progresso.
- `WorkflowTemplate` versionado e reutilizável.
- Etapas com estados: não iniciada, em andamento, bloqueada, concluída e não aplicável com justificativa.
- Requisitos com estados: pendente, atendido, dispensado e bloqueado.
- Aprovações por nível de risco.
- `ChangeSet` para registrar alterações preparadas, aplicadas e revertidas.
- Conversas próprias da IA, mensagens, chamadas de ferramentas e registros de uso/custo.
- Provedores OpenAI e Gemini por uma interface comum.
- Chaves criptografadas no banco; nunca retornadas integralmente ao navegador ou à auditoria.
- Modos Assistente, Copiloto e Autonomia Supervisionada.
- Perfis de dados Protegido e Profissional.
- Feature flags para ativação gradual.

## Workflows iniciais

- AET;
- PGR;
- PCMSO;
- LTCAT;
- insalubridade;
- periculosidade;
- higiene ocupacional e avaliações ambientais;
- treinamentos e avaliações de aprendizagem.

Esses modelos são dados estruturados no domínio. Novos serviços poderão ser criados sobre o mesmo motor.

## O que não está habilitado neste checkpoint

- conversa operacional do copiloto;
- execução real das ferramentas de cadastro;
- análise de PDFs, fotos e planilhas;
- importação de laudos antigos;
- geração automática de documentos a partir do novo `WorkProject`;
- faturamento e portais adicionais.

As tabelas e contratos necessários para essas etapas já foram preparados.
