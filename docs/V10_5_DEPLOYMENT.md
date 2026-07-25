# Implantação segura do Checkpoint 10.5

## Pré-condições

1. Checkpoint 10.4 aprovado no GitHub Actions e no Railway staging.
2. Backup verificado do PostgreSQL e do Bucket.
3. Ambiente staging separado da produção.
4. Empresa fictícia com estabelecimento, funções, GHEs e PGR de teste.
5. Usuários de teste com perfis Administrador, Consultor, Médico do Trabalho e Assistente Médico.

## Variáveis iniciais

```env
FEATURE_V10_WORKS=true
FEATURE_AI_SETTINGS=true
FEATURE_LEGACY_IMPORTS=true
FEATURE_AI_COPILOT=true
FEATURE_V10_HOME=true
FEATURE_FIELD_OPERATIONS=true
FEATURE_MULTIMODAL_INPUT=true
FEATURE_PGR_GRO=true
FEATURE_PSYCHOSOCIAL_GRO=true
FEATURE_PCMSO=false
FEATURE_MEDICAL_AREA=false
FEATURE_ESOCIAL_S2220=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, documentos, Worker e checkpoints anteriores.
3. Criar um Trabalho SST do tipo PCMSO.
4. Ativar `FEATURE_PCMSO=true`.
5. Inicializar o programa e vincular o PGR.
6. Cadastrar clínica, médico responsável e médico examinador fictícios.
7. Cadastrar trabalhadores com função e GHE.
8. Criar catálogo e matriz de exames.
9. Gerar convocações duas vezes e confirmar idempotência.
10. Validar periodicidade, vencimentos e cobertura da matriz.
11. Ativar `FEATURE_MEDICAL_AREA=true`.
12. Confirmar que Administrador e Consultor não acessam dados clínicos nem emitem ASO.
13. Confirmar que Médico do Trabalho pode registrar exames, aptidão e emitir ASO.
14. Confirmar que Assistente Médico não possui permissão de emissão quando não concedida.
15. Gerar relatório analítico e verificar que somente agregados são exibidos.
16. Ativar `FEATURE_ESOCIAL_S2220=true`.
17. Preparar rascunhos válidos e inválidos do S-2220.
18. Confirmar CNPJ numérico, CNPJ alfanumérico e raiz cadastral do empregador.
19. Confirmar tipo de monitoração pontual e bloqueio de exame posterior ao ASO.
20. Executar auditoria PCMSO.
21. Testar `get_pcmso_overview` e `run_pcmso_audit` no Copiloto.
22. Validar isolamento com outro tenant.
23. Consultar `MedicalDataAccessLog` para as ações sensíveis.
24. Somente depois repetir a implantação em produção.

## Banco de dados

O checkpoint acrescenta enums, modelos e relações de PCMSO, prestadores, profissionais, trabalhadores, matriz, convocações, ASO, exames, relatórios, auditoria, logs médicos e rascunhos S-2220. Não remove nem renomeia estruturas dos checkpoints anteriores.

A baseline do banco real e a aplicação oficial com Prisma devem ser verificadas antes da produção. Não elimine tabelas médicas durante rollback de aplicação.

## Rollback funcional

```env
FEATURE_ESOCIAL_S2220=false
FEATURE_MEDICAL_AREA=false
FEATURE_PCMSO=false
```

Os dados permanecem preservados. O rollback funcional não deve apagar programa, ASOs, logs ou rascunhos existentes.

## Aceite mínimo

- programa vinculado à empresa e ao Trabalho SST;
- PGR referenciado;
- médicos e prestadores isolados por tenant;
- CPF protegido e sem duplicidade;
- matriz por GHE/função/risco;
- vencimentos calculados corretamente;
- convocações idempotentes;
- aptidão exclusiva de perfil médico autorizado;
- relatório analítico agregado;
- rascunho S-2220 validado sem transmissão;
- CNPJ alfanumérico e raiz cadastral cobertos;
- auditoria coerente;
- Copiloto sem ferramenta clínica de aptidão;
- nenhuma regressão nos 154 testes anteriores.
