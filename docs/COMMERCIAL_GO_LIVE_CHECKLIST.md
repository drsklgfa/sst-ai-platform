# Checklist de lançamento comercial

## Código e infraestrutura

- [ ] `package-lock.json` gerado e commitado.
- [ ] GitHub Actions verde no commit/tag da release.
- [ ] `prisma format`, `validate`, `generate` e typecheck real aprovados.
- [ ] Drift do banco igual a zero.
- [ ] Build Next.js e imagem Docker aprovados.
- [ ] Web e Worker saudáveis.
- [ ] `RELEASE_VERSION` corresponde à tag implantada.
- [ ] Staging e produção usam bancos e Buckets separados.

## Segurança e privacidade

- [ ] HTTPS válido.
- [ ] S3/Bucket privado.
- [ ] Chaves fora do GitHub e dos logs.
- [ ] Perfis médicos revisados.
- [ ] Teste de isolamento entre tenants e empresas aprovado.
- [ ] Exportação, retenção e exclusão testadas.
- [ ] Política de privacidade e termos publicados.
- [ ] Contrato de tratamento de dados revisado.
- [ ] Plano de resposta a incidentes conhecido pela equipe.

## Continuidade

- [ ] Backup do PostgreSQL concluído.
- [ ] Backup do Bucket concluído no mesmo marco temporal.
- [ ] Hashes e manifestos preservados.
- [ ] Restauração testada em ambiente isolado.
- [ ] RTO e RPO definidos.
- [ ] Responsável pelo rollback definido.

## Produto SST

- [ ] PGR, PCMSO, LTCAT, LI, LP e AET testados com casos fictícios completos.
- [ ] Documento antigo importado e migrado para o novo modelo.
- [ ] Cálculos determinísticos comparados com referência manual.
- [ ] Emissão final exige aprovação humana.
- [ ] Área médica não expõe dados clínicos a perfis gerais.
- [ ] Evidências e fontes podem ser rastreadas.
- [ ] Renovação anual preserva o histórico.

## IA

- [ ] Política protegida testada.
- [ ] Limites diários e mensais definidos.
- [ ] Nenhuma ação crítica é executada sem aprovação.
- [ ] Imagens e documentos não produzem medições inventadas.
- [ ] Ferramentas disponíveis respeitam RBAC e tenant.
- [ ] Custos e erros estão visíveis.

## Cobrança

- [ ] Plano, assinatura, fatura e franquias revisados.
- [ ] Sandbox do gateway aprovado.
- [ ] Checkout criado por fatura.
- [ ] Webhook válido atualiza a fatura após consulta ao provedor.
- [ ] Webhook inválido é rejeitado.
- [ ] Evento duplicado é idempotente.
- [ ] Reembolso e cancelamento foram testados.
- [ ] Inadimplência não apaga dados do cliente.

## eSocial, quando habilitado

- [ ] Leiaute vigente confirmado.
- [ ] XML de lote assinado validado.
- [ ] PFX e passphrase configurados somente no servidor.
- [ ] Ambiente restrito aceita os eventos de teste.
- [ ] Recibo e rejeições são persistidos.
- [ ] Retificação e exclusão possuem procedimento operacional definido.
- [ ] Produção permanece desativada até aceite formal.

## Comercial e suporte

- [ ] Planos e limites publicados.
- [ ] Onboarding do primeiro cliente documentado.
- [ ] Canal de suporte definido.
- [ ] SLA e política de manutenção definidos.
- [ ] Processo de cancelamento e exportação testado.
- [ ] Cliente piloto aprovado antes da venda ampla.
