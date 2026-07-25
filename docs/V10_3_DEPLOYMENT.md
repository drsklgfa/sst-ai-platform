# Implantação segura do Checkpoint 10.3

## Pré-condições

1. GitHub Actions do Checkpoint 10.2 aprovado.
2. Backup do PostgreSQL e do Bucket.
3. Ambiente Railway staging separado.
4. OpenAI ou Gemini configurado apenas se a análise multimodal for testada.

## Variáveis

Implante inicialmente com:

```env
FEATURE_V10_WORKS=true
FEATURE_AI_SETTINGS=true
FEATURE_LEGACY_IMPORTS=true
FEATURE_AI_COPILOT=true
FEATURE_V10_HOME=false
FEATURE_FIELD_OPERATIONS=false
FEATURE_MULTIMODAL_INPUT=false
```

## Sequência de ativação

1. Aplicar o schema aditivo no staging.
2. Confirmar login, empresas, documentos, Worker e módulos anteriores.
3. Ativar `FEATURE_V10_HOME=true` e conferir a central principal.
4. Ativar `FEATURE_FIELD_OPERATIONS=true`.
5. Criar visita sem IA, adicionar nota e medição e revisar permissões.
6. Fotografar pelo celular, anexar áudio e PDF.
7. Confirmar storage privado, download autorizado e vínculo ao Trabalho SST.
8. Configurar um modelo com capacidade de imagens/PDF.
9. Ativar `FEATURE_MULTIMODAL_INPUT=true`.
10. Confirmar job `FIELD_ANALYZE_CAPTURE`, estados e retentativa.
11. Aprovar e rejeitar evidências em revisão.
12. Enviar anexos no Copiloto e validar o consentimento obrigatório.
13. Testar outro tenant e confirmar isolamento.
14. Somente depois repetir em produção.

## Banco de dados

O checkpoint adiciona somente tabelas, enums, relações e índices. Não remove ou renomeia estruturas anteriores. A implantação atual continua seguindo o processo já adotado no projeto; a migração para `prisma migrate deploy` depende da baseline do banco real.

## Rollback funcional

Desative, nesta ordem:

```env
FEATURE_MULTIMODAL_INPUT=false
FEATURE_FIELD_OPERATIONS=false
FEATURE_V10_HOME=false
```

Os dados coletados permanecem no banco e no Bucket, mas os menus deixam de aparecer. Evite excluir tabelas em um rollback de aplicação.

## Aceite mínimo

- câmera e upload em dois navegadores móveis;
- áudio e PDF preservados;
- medição manual sem IA;
- localização somente após permissão;
- Worker processa ou registra falha real;
- revisão humana obrigatória;
- anexos do Copiloto acessíveis somente ao tenant correto;
- nenhuma regressão nos 131 testes anteriores.
