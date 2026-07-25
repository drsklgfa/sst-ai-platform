# Implantação segura do Checkpoint 10.6

## Pré-condições

1. Checkpoint 10.5 aprovado no GitHub Actions e no Railway staging.
2. Backup verificado do PostgreSQL e do Bucket.
3. Ambiente staging separado da produção.
4. Empresa fictícia com estabelecimento, setor, GHE, função e trabalhadores.
5. PGR e PCMSO fictícios para testar reutilização.
6. Usuários com perfis Administrador, Consultor, Revisor e Responsável Técnico.

## Variáveis iniciais

```env
FEATURE_EXPOSURE_CORE=false
FEATURE_LTCAT_PPP=false
FEATURE_INSALUBRIDADE=false
FEATURE_PERICULOSIDADE=false
FEATURE_ESOCIAL_S2240=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, documentos, Worker e todos os checkpoints anteriores.
3. Criar Trabalhos SST fictícios dos tipos LTCAT, INSALUBRIDADE e PERICULOSIDADE.
4. Ativar `FEATURE_EXPOSURE_CORE=true`.
5. Iniciar o programa de exposições em cada trabalho.
6. Cadastrar profissional técnico fictício e vinculá-lo ao trabalho.
7. Criar períodos por GHE, função e trabalhador.
8. Confirmar bloqueio de períodos individuais sobrepostos.
9. Cadastrar agentes qualitativos e quantitativos.
10. Registrar medições com e sem certificado de calibração e validar alertas.
11. Registrar EPC/EPI eficaz e confirmar exigência de evidências mínimas.
12. Executar auditoria e validar erros, alertas e pontuação.
13. Ativar `FEATURE_LTCAT_PPP=true`.
14. Salvar conclusão para revisão e confirmar que Consultor não pode aprovar.
15. Aprovar com Responsável Técnico e conferir auditoria.
16. Preparar PPP por trabalhador e revisar histórico temporal.
17. Ativar `FEATURE_ESOCIAL_S2240=true`.
18. Preparar rascunhos válidos e inválidos do S-2240.
19. Confirmar que nenhuma transmissão externa é realizada.
20. Ativar `FEATURE_INSALUBRIDADE=true`.
21. Testar anexos qualitativos e quantitativos da NR-15, neutralização e graus.
22. Ativar `FEATURE_PERICULOSIDADE=true`.
23. Testar categoria, área de risco, padrão de exposição e conclusão.
24. Confirmar que somente perfil autorizado aprova conclusões técnicas.
25. Testar `get_exposure_overview` e `run_exposure_audit` no Copiloto.
26. Confirmar ausência de ferramentas de aprovação ou transmissão para a IA.
27. Validar isolamento com outro tenant.
28. Gerar documentos de teste e revisar anexos, períodos e conclusões.
29. Somente depois repetir a implantação em produção.

## Banco de dados

O checkpoint adiciona modelos e enums para profissionais técnicos, programas, períodos, agentes, medições, controles, conclusões previdenciárias e trabalhistas, PPP, S-2240 e auditorias. Não remove nem renomeia estruturas anteriores.

A migration deve ser gerada e revisada sobre uma cópia do banco real. Não utilize uma alteração destrutiva nem apague dados durante rollback funcional.

## Rollback funcional

```env
FEATURE_ESOCIAL_S2240=false
FEATURE_PERICULOSIDADE=false
FEATURE_INSALUBRIDADE=false
FEATURE_LTCAT_PPP=false
FEATURE_EXPOSURE_CORE=false
```

Os registros continuam preservados e podem ser reativados após correção.

## Aceite mínimo

- períodos históricos sem sobreposição indevida;
- agentes qualitativos e quantitativos rastreáveis;
- medições com metodologia e calibração;
- EPC/EPI sem presunção automática de eficácia;
- conclusão aprovada apenas por profissional autorizado;
- PPP em ordem temporal e com alertas;
- S-2240 validado sem transmissão;
- NR-15 e NR-16 versionáveis;
- auditoria coerente;
- Copiloto limitado a panorama e auditoria;
- nenhuma regressão nos 168 testes anteriores.
