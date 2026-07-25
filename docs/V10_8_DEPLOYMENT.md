# Implantação segura do Checkpoint 10.8

## Pré-condições

1. Checkpoint 10.7 aprovado no GitHub Actions e no Railway staging.
2. Backup verificado do PostgreSQL e do Bucket.
3. Ambiente staging separado da produção.
4. Empresa fictícia com unidade, setor, GHE, função, posto e trabalhador.
5. Trabalho SST fictício do tipo Higiene Ocupacional.
6. Usuários Consultor e Responsável Técnico.
7. Instrumentos e certificados fictícios para homologação.
8. Casos de referência com resultados previamente conferidos.

## Variáveis iniciais

```env
FEATURE_OCCUPATIONAL_HYGIENE=false
FEATURE_INSTRUMENT_MANAGEMENT=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, documentos, Worker e todos os checkpoints anteriores.
3. Criar ou atualizar um Trabalho SST de Higiene Ocupacional para workflow versão 2.
4. Ativar `FEATURE_OCCUPATIONAL_HYGIENE=true`.
5. Abrir `/hygiene/{workProjectId}`.
6. Criar o programa e conferir escopo, responsável e limitações.
7. Criar planos para ruído, calor, vibração, iluminamento, químico e biológico.
8. Confirmar que método desconhecido é rejeitado.
9. Confirmar que método sem motor exige resultado manual.
10. Testar média ponderada, IBUTG, frações de dose e resultante vetorial com casos conhecidos.
11. Registrar dados brutos, níveis, limites, incerteza e condições de campo.
12. Confirmar que uma medição sem instrumento é bloqueada quando o método o exige.
13. Confirmar que uma medição inválida não pode ser aprovada.
14. Ativar `FEATURE_INSTRUMENT_MANAGEMENT=true`.
15. Cadastrar instrumentos, localização e responsável.
16. Registrar calibração válida, vencida, rejeitada e pendente.
17. Confirmar bloqueio de instrumento vencido, em manutenção ou aposentado.
18. Testar calibração de campo antes/depois e tolerância.
19. Registrar reserva, retirada, devolução, manutenção, bloqueio e aposentadoria.
20. Confirmar atualização do status e do histórico.
21. Vincular uma medição ao agente canônico de exposição.
22. Executar revisão com Responsável Técnico e confirmar bloqueio ao Consultor.
23. Executar auditoria incompleta e completa.
24. Testar `get_hygiene_overview` e `run_hygiene_audit` no Copiloto.
25. Confirmar ausência de ferramentas de aprovação, emissão e conclusão legal na IA.
26. Gerar relatório de teste e conferir dados brutos, memória, instrumentos, calibrações e anexos.
27. Validar isolamento com outro tenant.
28. Somente depois repetir a implantação em produção.

## Banco de dados

O checkpoint acrescenta programa de higiene, planos de amostragem, medições, instrumentos, calibrações, eventos e auditorias. Não remove nem renomeia estruturas anteriores.

A migration deve ser gerada e revisada sobre uma cópia do banco real. Não use `prisma db push` como substituto do histórico de migration em produção após a baseline controlada.

## Dados de homologação

Use somente dados fictícios ou anonimizados. Não utilize certificados, medições ou conclusões reais para testar permissões e fluxos iniciais.

## Rollback funcional

```env
FEATURE_OCCUPATIONAL_HYGIENE=false
FEATURE_INSTRUMENT_MANAGEMENT=false
```

Os registros permanecem preservados e podem ser reativados após correção.

## Aceite mínimo

- programa e planos rastreáveis;
- métodos e versões explícitos;
- cálculos determinísticos comparados com casos de referência;
- métodos sem motor sem resultado inventado;
- instrumento obrigatório e calibração válida;
- calibração de campo validada;
- dados brutos e memória preservados;
- revisão restrita ao responsável técnico;
- histórico de instrumento íntegro;
- vínculo com agente canônico de exposição;
- auditoria coerente;
- documento completo;
- Copiloto limitado a panorama e auditoria;
- nenhuma regressão nos 197 testes anteriores.
