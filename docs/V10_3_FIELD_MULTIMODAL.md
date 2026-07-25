# Checkpoint 10.3 — Experiência principal, campo e multimodal

## Objetivo

Transformar a base dos checkpoints 10.0–10.2 em uma operação prática para o consultor, especialmente no celular, sem remover as telas avançadas existentes.

## Experiência principal

Quando `FEATURE_V10_HOME=true`, o painel passa a apresentar a central **“O que deseja fazer hoje?”**, com atalhos para:

- novo Trabalho SST;
- importação de laudo antigo;
- coleta em campo;
- Copiloto Operacional;
- empresas;
- documentos e trabalhos em andamento.

As telas anteriores continuam disponíveis e não dependem da IA.

## Coleta em campo

A área `/field-visits` permite criar visitas vinculadas a:

- empresa;
- Trabalho SST;
- vistoria já existente;
- etapa do workflow;
- setor;
- GHE;
- função;
- posto de trabalho.

Cada visita possui checklist adaptado ao serviço, progresso, estado, localização opcional e registros de campo.

## Tipos de registro

- fotografia capturada pelo celular;
- vídeo existente;
- áudio ou observação gravada;
- PDF, DOCX, XLSX, CSV ou TXT;
- nota textual;
- medição com valor e unidade.

O arquivo original fica no storage privado, com hash e autorização contextual.

## Análise assistida

Fotos, áudios e documentos podem gerar o job `FIELD_ANALYZE_CAPTURE`. O Worker:

1. carrega a configuração ativa de IA;
2. verifica capacidade de imagem/PDF;
3. envia o arquivo ao modelo configurado;
4. pede saída estruturada;
5. registra consumo;
6. deixa o resultado em `REVIEW`;
7. exige aprovação ou rejeição humana.

A instrução proíbe a IA de inventar peso, distância, ângulo, duração, ruído, concentração, temperatura, diagnóstico ou conclusão legal. O resultado deve apontar observações, possíveis fatores, medições faltantes, perguntas sugeridas, alertas de privacidade e confiança.

## Copiloto multimodal

Uma mensagem do Copiloto pode receber até quatro arquivos, limitados a 60 MB no conjunto. Os anexos:

- são preservados em `FileObject`;
- são vinculados por `AIMessageAttachment`;
- aparecem no histórico;
- são enviados somente no primeiro ciclo da mensagem;
- exigem confirmação explícita de revisão/autorização de dados pessoais;
- recebem estado `UPLOADED`, `ANALYZING`, `READY` ou `FAILED`.

## Privacidade e segurança

- nenhuma geolocalização é coletada automaticamente;
- o navegador solicita permissão antes de registrar coordenadas;
- latitude, longitude e precisão são validadas;
- arquivos do Copiloto exigem `work.manage`;
- arquivos de campo exigem `inspection.manage`;
- todos os vínculos são validados dentro da empresa e do tenant;
- análise da IA não significa aprovação técnica;
- arquivos com pessoas ou dados pessoais exigem declaração do profissional.

## Estados e revisão

Visitas: `DRAFT`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `REVIEWED`, `CANCELLED`.

Capturas: `CAPTURED`, `QUEUED`, `ANALYZING`, `REVIEW`, `READY`, `FAILED`, `REJECTED`.

A evidência analisada só chega a `READY` após revisão humana.

## Feature flags

```env
FEATURE_V10_HOME=false
FEATURE_FIELD_OPERATIONS=false
FEATURE_MULTIMODAL_INPUT=false
```

Ative uma por vez no staging. `FEATURE_FIELD_OPERATIONS=true` pode ser usado sem IA; nesse caso notas e medições manuais continuam funcionando e arquivos ficam preservados sem análise automática.

## Limites deste checkpoint

- não há sincronização offline completa de uploads; conexão é necessária para salvar no servidor;
- vídeo é preservado, mas a análise automática inicial prioriza foto, áudio e documento;
- transcrição e análise dependem das capacidades reais do provedor/modelo;
- não há validação real de API neste ambiente de construção.
