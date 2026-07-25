# Implantação segura do Checkpoint 10.4

## Pré-condições

1. Checkpoint 10.3 aprovado no GitHub Actions.
2. Backup do PostgreSQL e do Bucket.
3. Ambiente Railway staging separado.
4. Uma empresa fictícia com unidade, setor, GHE e campanha de teste.

## Variáveis iniciais

```env
FEATURE_V10_WORKS=true
FEATURE_AI_SETTINGS=true
FEATURE_LEGACY_IMPORTS=true
FEATURE_AI_COPILOT=true
FEATURE_V10_HOME=true
FEATURE_FIELD_OPERATIONS=true
FEATURE_MULTIMODAL_INPUT=true
FEATURE_PGR_GRO=false
FEATURE_PSYCHOSOCIAL_GRO=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, documentos, campanhas, Worker e checkpoints anteriores.
3. Criar um Trabalho SST do tipo PGR.
4. Ativar `FEATURE_PGR_GRO=true`.
5. Inicializar o programa e cadastrar riscos físicos, químicos, ergonômicos e de acidente.
6. Confirmar cálculo inicial/residual e vínculo com GHE.
7. Gerar o plano de ação duas vezes e confirmar idempotência.
8. Registrar participação dos trabalhadores e CIPA.
9. Executar auditoria e conferir falhas e alertas esperados.
10. Criar campanha psicossocial fictícia com grupos acima e abaixo dos limites.
11. Ativar `FEATURE_PSYCHOSOCIAL_GRO=true`.
12. Confirmar ocultação de grupos insuficientes e ausência de resposta individual na interface.
13. Aprovar a consolidação e repetir a auditoria.
14. Testar o Copiloto com `get_pgr_overview` e `run_pgr_audit`.
15. Validar isolamento com outro tenant.
16. Somente depois repetir em produção.

## Banco de dados

O checkpoint acrescenta enums, seis models e relações. Não remove nem renomeia estruturas anteriores. O processo atual de sincronização permanece até que a baseline do banco real permita migrar com segurança para `prisma migrate deploy`.

## Rollback funcional

```env
FEATURE_PSYCHOSOCIAL_GRO=false
FEATURE_PGR_GRO=false
```

Os dados permanecem preservados. Não exclua tabelas em rollback de aplicação.

## Aceite mínimo

- inventário por GHE;
- risco inicial e residual corretos;
- rastreabilidade de origem;
- plano de ação sem duplicação;
- participação registrada;
- grupos psicossociais pequenos ocultos;
- auditoria com resultados coerentes;
- Copiloto sem acesso genérico ao banco;
- nenhuma regressão nos 141 testes anteriores.
