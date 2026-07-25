# Implantação segura do Checkpoint 10.9

## Pré-condições

1. Checkpoint 10.8 aprovado no GitHub Actions e Railway staging.
2. Backup verificado do PostgreSQL e Bucket.
3. Staging separado da produção.
4. Empresa fictícia com funções, GHEs, riscos e trabalhadores.
5. Trabalho SST fictício do tipo Treinamento.
6. Usuários Consultor, Revisor, Responsável Técnico e acesso de aluno.

## Feature flags iniciais

```env
FEATURE_CORPORATE_UNIVERSITY=false
FEATURE_TRAINING_ASSESSMENTS=false
FEATURE_COMPETENCY_MATRIX=false
FEATURE_TRAINING_CERTIFICATES=false
```

## Ordem de ativação

1. Aplicar a migration aditiva no staging.
2. Confirmar login, Worker, documentos e checkpoints anteriores.
3. Ativar `FEATURE_CORPORATE_UNIVERSITY=true`.
4. Criar o programa, projeto pedagógico e cursos.
5. Criar módulos, aulas, materiais e links externos.
6. Publicar um curso e confirmar que ele fica imutável.
7. Criar nova versão do mesmo código e confirmar preservação da anterior.
8. Matricular trabalhador e gerar link temporário.
9. Abrir o portal em janela anônima e confirmar que token inválido ou vencido é recusado.
10. Abrir aula, aguardar heartbeat, concluir e conferir logs.
11. Testar material protegido e isolamento entre cursos.
12. Ativar `FEATURE_TRAINING_ASSESSMENTS=true`.
13. Testar questões objetivas, pesos, aprovação, reprovação e limite de tentativas.
14. Testar questão discursiva e confirmar revisão humana obrigatória.
15. Testar avaliação prática e presença.
16. Ativar `FEATURE_COMPETENCY_MATRIX=true`.
17. Criar trilhas, regras por função/GHE/risco e aplicar aos trabalhadores.
18. Confirmar que matrículas de outro programa não aparecem no trabalho atual.
19. Ativar `FEATURE_TRAINING_CERTIFICATES=true`.
20. Confirmar bloqueio do certificado incompleto.
21. Emitir certificado completo, validar código público e validade.
22. Revogar o certificado e confirmar invalidação pública e da competência.
23. Executar auditoria incompleta e completa.
24. Testar `get_training_overview` e `run_training_audit`.
25. Confirmar que a IA não possui ferramentas decisórias.
26. Validar isolamento com outro tenant.
27. Liberar produção somente após homologação pedagógica, técnica e de segurança.

## Banco de dados

O checkpoint acrescenta modelos de programas, cursos, conteúdo, avaliações, trilhas, regras, matrículas, progresso, tentativas, prática, sessões, presença, logs, certificados, competências e auditorias. Matrículas e sessões pertencem explicitamente ao programa para impedir mistura entre ciclos ou Trabalhos SST.

Gere e revise a migration sobre uma cópia do banco real. Não substitua o histórico de migrations por `prisma db push` após a baseline controlada.

## Rollback funcional

```env
FEATURE_CORPORATE_UNIVERSITY=false
FEATURE_TRAINING_ASSESSMENTS=false
FEATURE_COMPETENCY_MATRIX=false
FEATURE_TRAINING_CERTIFICATES=false
```

Os registros ficam preservados para correção e reativação.

## Aceite mínimo

- cursos versionados e publicação imutável;
- portal individual com token hash e validade;
- arquivos protegidos;
- logs de tempo sem duração fabricada;
- correção objetiva determinística;
- revisão humana de discursivas;
- avaliação prática protegida;
- presença rastreável;
- regras por função, GHE e risco;
- certificados bloqueados até completude;
- verificação e revogação públicas;
- competências atualizadas e invalidadas corretamente;
- auditoria coerente;
- Copiloto apenas consultivo;
- nenhuma regressão nos testes anteriores.
