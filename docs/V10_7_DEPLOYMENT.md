# Implantação segura do Checkpoint 10.7

## Pré-condições

1. Checkpoint 10.6 aprovado no GitHub Actions e no Railway staging.
2. Backup verificado do PostgreSQL e do Bucket.
3. Ambiente staging separado da produção.
4. Empresa fictícia com unidade, setor, GHE, função, posto e trabalhadores.
5. Trabalho SST fictício do tipo AET.
6. Usuários Consultor, Revisor e Responsável Técnico.
7. Evidências fictícias de campo para vinculação.

## Variável inicial

```env
FEATURE_ERGONOMICS=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, documentos, Worker e todos os checkpoints anteriores.
3. Criar ou atualizar um Trabalho SST AET para workflow versão 2.
4. Ativar `FEATURE_ERGONOMICS=true`.
5. Abrir `/ergonomics/{workProjectId}`.
6. Registrar escopo, responsável e demanda.
7. Criar situações comparando trabalho prescrito e real.
8. Registrar variabilidade, estratégias, constrangimentos, pausas, duração e frequência.
9. Registrar participação de trabalhadores.
10. Executar RULA, REBA e NIOSH com casos conhecidos e conferir os motores existentes.
11. Registrar OCRA, ROSA ou outro método sem motor e confirmar ausência de score inventado.
12. Revisar uma avaliação com Responsável Técnico e confirmar bloqueio ao Consultor.
13. Criar achados baixos, moderados, altos e críticos.
14. Gerar plano de ação e confirmar ausência de duplicidade.
15. Registrar decisão da AEP e testar as três conclusões.
16. Confirmar que `AET_REQUIRED` exige habilitação do aprofundamento.
17. Executar auditoria incompleta e completa.
18. Testar `get_ergonomics_overview` e `run_ergonomics_audit` no Copiloto.
19. Confirmar que a IA não possui ferramentas de aprovação, emissão ou assinatura.
20. Vincular fotos, áudios e medições provenientes do modo de campo.
21. Gerar documento de teste e conferir seções, fontes, limitações e anexos.
22. Validar isolamento com outro tenant.
23. Somente depois repetir a implantação em produção.

## Banco de dados

O checkpoint adiciona modelos e enums de programa ergonômico, demandas, situações, participação, métodos, achados, decisão preliminar e auditoria. Não remove nem renomeia estruturas anteriores.

A migration deve ser gerada e revisada sobre uma cópia do banco real. Não aplique alteração destrutiva e não apague os registros durante rollback funcional.

## Rollback funcional

```env
FEATURE_ERGONOMICS=false
```

Os dados continuam preservados e podem ser reativados após correção.

## Aceite mínimo

- demanda e situação real rastreáveis;
- trabalho prescrito e real comparáveis;
- participação registrada;
- RULA, REBA e NIOSH determinísticos;
- métodos sem motor sem score automático;
- revisão e decisão reservadas ao perfil autorizado;
- achados integrados ao risco e plano de ação;
- AEP determina aprofundamento de forma fundamentada;
- auditoria coerente;
- documento completo;
- Copiloto limitado a panorama e auditoria;
- nenhuma regressão nos 183 testes anteriores.
