import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datedStatus, ppeDeliveryEligible, permitEligibility, contractorComplianceScore, incidentEscalation, obligationState } from '../src/domain/operations/rules.ts';
import { auditOperationalCompleteness } from '../src/domain/operations/audit.ts';
import { billingPeriod, invoiceTransition, planEntitlement, subscriptionState } from '../src/domain/commercial/subscription.ts';
import { esocialIdempotencyKey, esocialStatusTransition, validateEsocialDraft } from '../src/domain/integrations/esocial.ts';
import { normalizePaymentStatus, verifyPaymentWebhookSignature } from '../src/domain/commercial/payments.ts';
import { hasCompanyPermission, hasTenantPermission } from '../src/lib/rbac.ts';
import { createHmac } from 'node:crypto';

const schema=readFileSync('prisma/schema.prisma','utf8');
const env=readFileSync('src/lib/env.ts','utf8');
const operations=readFileSync('src/lib/operations.ts','utf8');
const billing=readFileSync('src/lib/billing.ts','utf8');
const esocial=readFileSync('src/lib/esocial.ts','utf8');
const page=readFileSync('src/app/(app)/operations/[id]/page.tsx','utf8');
const billingPage=readFileSync('src/app/(app)/settings/billing/page.tsx','utf8');
const permitRoute=readFileSync('src/app/api/operations/[id]/permits/route.ts','utf8');
const incidentRoute=readFileSync('src/app/api/operations/[id]/incidents/route.ts','utf8');
const billingRoute=readFileSync('src/app/api/billing/invoices/route.ts','utf8');
const webhookRoute=readFileSync('src/app/api/public/payments/webhook/[provider]/route.ts','utf8');
const sections=readFileSync('src/domain/documents/default-sections.ts','utf8');
const workflows=readFileSync('src/domain/workflows/templates.ts','utf8');
const aiCatalog=readFileSync('src/domain/ai/operational-tools.ts','utf8');
const aiTools=readFileSync('src/lib/ai-tools.ts','utf8');
const portal=readFileSync('src/app/portal/company/[id]/page.tsx','utf8');

test('validade diferencia ausente, vencido, próximo e válido',()=>{
  const ref=new Date('2026-07-23T00:00:00Z');
  assert.equal(datedStatus(null,ref),'MISSING');
  assert.equal(datedStatus(new Date('2026-07-01T00:00:00Z'),ref),'EXPIRED');
  assert.equal(datedStatus(new Date('2026-08-01T00:00:00Z'),ref),'EXPIRING');
  assert.equal(datedStatus(new Date('2027-01-01T00:00:00Z'),ref),'VALID');
});

test('entrega de EPI exige CA, estoque, orientação e adequação',()=>{
  const allowed=ppeDeliveryEligible({caExpiresAt:new Date('2027-01-01'),trainingConfirmed:true,fitConfirmed:true,stockQuantity:10,quantity:1,reference:new Date('2026-07-23')});
  assert.equal(allowed.eligible,true);
  const blocked=ppeDeliveryEligible({caExpiresAt:new Date('2026-01-01'),trainingConfirmed:false,fitConfirmed:false,stockQuantity:0,quantity:2,reference:new Date('2026-07-23')});
  assert.equal(blocked.eligible,false); for(const reason of ['CA vencido','orientação ou treinamento não confirmado','adequação ao trabalhador não confirmada','estoque insuficiente'])assert.ok(blocked.reasons.includes(reason));
});

test('permissão de trabalho não é autorizada com checklist ou controles incompletos',()=>{
  const failed=permitEligibility({startsAt:new Date('2026-07-23T10:00:00Z'),endsAt:new Date('2026-07-23T09:00:00Z'),checklistItems:2,completedChecklistItems:1,controlCount:0,workerCount:0,approverUserId:null,measurementsRequired:true,measurementCount:0});
  assert.equal(failed.eligible,false); assert.ok(failed.reasons.length>=5);
  const allowed=permitEligibility({startsAt:new Date('2026-07-23T09:00:00Z'),endsAt:new Date('2026-07-23T10:00:00Z'),checklistItems:2,completedChecklistItems:2,controlCount:2,workerCount:2,approverUserId:'u',measurementsRequired:true,measurementCount:1}); assert.equal(allowed.eligible,true);
});

test('conformidade da contratada considera documentos, trabalhadores, integração e riscos compartilhados',()=>{
  assert.deepEqual(contractorComplianceScore({requiredDocuments:2,validDocuments:2,requiredWorkers:2,clearedWorkers:2,riskSharingDefined:true,integrationCompleted:true}),{score:100,status:'COMPLIANT'});
  assert.equal(contractorComplianceScore({requiredDocuments:4,validDocuments:1,requiredWorkers:4,clearedWorkers:1,riskSharingDefined:false,integrationCompleted:false}).status,'NON_COMPLIANT');
});

test('ocorrência define CAT, S-2210, notificação e investigação sem decisão da IA',()=>{
  assert.deepEqual(incidentEscalation({kind:'ACCIDENT',severity:'CRITICAL',workerInvolved:true,lostTime:true,fatality:false}),{catRequired:true,esocialS2210Required:true,immediateNotification:true,formalInvestigation:true});
  assert.equal(incidentEscalation({kind:'NEAR_MISS',severity:'LOW',workerInvolved:false,lostTime:false,fatality:false}).catRequired,false);
});

test('obrigações legais mudam para vencida, cumprida ou dispensada',()=>{
  const ref=new Date('2026-07-23');
  assert.equal(obligationState({dueAt:new Date('2026-07-01'),reference:ref}),'OVERDUE');
  assert.equal(obligationState({completedAt:new Date('2026-07-20'),reference:ref}),'COMPLIANT');
  assert.equal(obligationState({waived:true,reference:ref}),'WAIVED');
});

test('auditoria operacional reprova lacunas críticas e aceita estrutura completa',()=>{
  const complete={hasScope:true,hasResponsible:true,ppeItems:1,expiredCaItems:0,lowStockItems:0,incidentsOpen:0,incidentsWithoutInvestigation:0,catPending:0,permitsActive:0,permitsExpiredOpen:0,machines:1,blockedMachines:0,overdueMachineInspections:0,chemicalProducts:1,chemicalsWithoutSds:0,emergencyPlanApproved:true,drillsOverdue:0,cipaRequired:false,cipaActive:false,contractors:1,nonCompliantContractors:0,obligations:1,overdueObligations:0,esocialRejected:0,workflowProgress:100};
  assert.equal(auditOperationalCompleteness(complete).status,'PASSED');
  const failed=auditOperationalCompleteness({...complete,hasScope:false,expiredCaItems:1,incidentsWithoutInvestigation:1,catPending:1,permitsExpiredOpen:1,chemicalsWithoutSds:1,emergencyPlanApproved:false,overdueObligations:1,esocialRejected:1});
  assert.equal(failed.status,'FAILED'); for(const code of ['OPS_SCOPE','OPS_PPE_CA','OPS_INCIDENT_INVESTIGATION','OPS_CAT_PENDING','OPS_PERMIT_EXPIRED','OPS_CHEMICAL_SDS','OPS_EMERGENCY_PLAN','OPS_LEGAL_OVERDUE','OPS_ESOCIAL_REJECTED'])assert.ok(failed.findings.some(item=>item.code===code));
});

test('planos controlam franquias e períodos mensais/anuais',()=>{
  assert.deepEqual(planEntitlement({limit:10,usage:3}),{allowed:true,unlimited:false,remaining:7});
  assert.equal(planEntitlement({limit:false,usage:0}).allowed,false);
  assert.equal(planEntitlement({limit:true,usage:999}).unlimited,true);
  assert.equal(billingPeriod(new Date('2026-01-31T00:00:00Z'),'MONTHLY').end.toISOString().slice(0,10),'2026-02-28');
  assert.equal(billingPeriod(new Date('2026-01-01T00:00:00Z'),'YEARLY').end.toISOString().slice(0,10),'2027-01-01');
});

test('faturas e assinatura obedecem máquina de estados',()=>{
  assert.equal(invoiceTransition('DRAFT','OPEN'),true); assert.equal(invoiceTransition('PAID','OPEN'),false); assert.equal(invoiceTransition('PAID','REFUNDED'),true);
  assert.equal(subscriptionState({status:'ACTIVE',currentPeriodEnd:new Date('2026-08-01'),reference:new Date('2026-07-23'),invoiceOverdue:true}),'PAST_DUE');
  assert.equal(subscriptionState({status:'TRIAL',trialEndsAt:new Date('2026-07-01'),currentPeriodEnd:new Date('2026-08-01'),reference:new Date('2026-07-23')}),'EXPIRED');
});

test('eSocial usa validação, idempotência e transições controladas',()=>{
  const draft={eventType:'S2210' as const,companyId:'c',workerId:'w',relatedEntityType:'Incident',relatedEntityId:'i',payload:{occurredAt:'2026-07-23'}};
  assert.equal(validateEsocialDraft(draft).valid,true);
  assert.equal(esocialIdempotencyKey(draft,'RESTRICTED').length,64);
  assert.equal(esocialIdempotencyKey(draft,'RESTRICTED'),esocialIdempotencyKey(draft,'RESTRICTED'));
  assert.equal(esocialStatusTransition('VALIDATED','QUEUED'),true); assert.equal(esocialStatusTransition('ACCEPTED','QUEUED'),false);
});

test('webhook de pagamento valida HMAC e normaliza status',()=>{
  const secret='12345678901234567890123456789012',body='{"id":"1"}',signature=createHmac('sha256',secret).update(body).digest('hex');
  assert.equal(verifyPaymentWebhookSignature(body,signature,secret),true); assert.equal(verifyPaymentWebhookSignature(body,'bad',secret),false);
  assert.equal(normalizePaymentStatus('approved'),'PAID'); assert.equal(normalizePaymentStatus('past_due'),'OVERDUE'); assert.equal(normalizePaymentStatus('unknown'),null);
});

test('schema inclui operação, eSocial, portais e cobrança sem dados soltos',()=>{
  for(const model of ['OperationalSstProgram','PpeCatalogItem','PpeTransaction','SafetyIncidentRecord','IncidentInvestigation','WorkPermit','MachineAsset','ChemicalProduct','EmergencyPlan','EmergencyDrill','CipaCycle','ContractorCompany','ComplianceObligation','EsocialEventQueue','CompanyPortalRequest','SaasPlan','TenantSubscription','BillingInvoice','BillingUsageRecord','PaymentWebhookEvent']) assert.match(schema,new RegExp(`model ${model} \\{`));
  for(const en of ['WorkPermitType','SafetyIncidentKind','EsocialEventType','SubscriptionStatus','PaymentProvider']) assert.match(schema,new RegExp(`enum ${en} \\{`));
});

test('RBAC separa operação, aprovação, transmissão e cobrança',()=>{
  assert.equal(hasTenantPermission('CONSULTANT','operations.manage'),true);
  assert.equal(hasTenantPermission('CONSULTANT','permit.approve'),false);
  assert.equal(hasTenantPermission('RESPONSIBLE_TECH','permit.approve'),true);
  assert.equal(hasTenantPermission('FINANCE','billing.manage'),true);
  assert.equal(hasTenantPermission('CONSULTANT','billing.manage'),false);
  assert.equal(hasCompanyPermission('RH_ADMIN','portal.request.create'),true);
  assert.equal(hasCompanyPermission('READER','portal.request.create'),false);
});

test('serviços impedem decisões irreversíveis e duplicidade silenciosa',()=>{
  assert.match(operations,/Entrega bloqueada/); assert.match(operations,/Aprovação exige responsável e conclusão fundamentada/); assert.match(operations,/Permissão não pode ser autorizada/); assert.match(operations,/operationalProgramId_code/);
  assert.match(esocial,/idempotencyKey/); assert.match(esocial,/Somente eventos validados podem entrar na fila/); assert.match(esocial,/Evento aceito exige fluxo formal de retificação ou exclusão/);
});

test('rotas reservam incidentes, permissões, cobrança e transmissão a permissões específicas',()=>{
  assert.match(incidentRoute,/authorizeTenantApi\('incident\.manage'\)/);
  assert.match(permitRoute,/permit\.approve/); assert.match(permitRoute,/permit\.issue/);
  assert.match(billingRoute,/authorizeTenantApi\('billing\.manage'\)/);
  assert.match(webhookRoute,/verifyAsaasWebhookToken/); assert.match(webhookRoute,/verifyMercadoPagoWebhookSignature/); assert.match(webhookRoute,/checkRateLimit/);
});

test('interface abraça operação SST e comercialização',()=>{
  for(const text of ['Governança do programa','EPI, CA e entregas','Acidentes, incidentes e CAT','Permissões de trabalho','Máquinas e NR-12','Produtos químicos e FDS','Emergências e CIPA','Contratadas e liberação de acesso','Matriz legal, eSocial e auditoria'])assert.match(page,new RegExp(text));
  for(const text of ['Planos, cobrança e uso','Criar plano SaaS','Ativar assinatura','Gerar fatura','Faturas recentes'])assert.match(billingPage,new RegExp(text));
  assert.match(portal,/Solicitações à consultoria/);
});

test('workflow e documento possuem estrutura operacional completa',()=>{
  for(const code of ['OPERACAO_SST','operational_governance','ppe_epc','incidents','critical_activities','assets_chemicals','emergency_cipa','contractors_portal','integrations','operational_assurance'])assert.match(workflows,new RegExp(code));
  for(const code of ['OPERATIONAL_GOVERNANCE','PPE_EPC','INCIDENT_MANAGEMENT','WORK_PERMITS','MACHINES_CHEMICALS','EMERGENCY_CIPA','CONTRACTORS','ESOCIAL_INTEGRATIONS','OPERATIONAL_AUDIT'])assert.match(sections,new RegExp(code));
});

test('copiloto recebe panorama e auditoria sem aprovar PT, CAT, investigação ou transmissão',()=>{
  assert.match(aiCatalog,/get_operational_overview/); assert.match(aiCatalog,/run_operational_audit/); assert.match(aiTools,/getOperationalOverview/); assert.match(aiTools,/runOperationalAudit/);
  assert.doesNotMatch(aiCatalog,/approve_work_permit|approve_incident_investigation|transmit_esocial|issue_cat|mark_invoice_paid/i);
});

test('módulos permanecem atrás de feature flags desativadas por padrão',()=>{
  for(const flag of ['FEATURE_OPERATIONAL_SST','FEATURE_EPI_EPC','FEATURE_INCIDENTS_CAT','FEATURE_WORK_PERMITS','FEATURE_MACHINES_NR12','FEATURE_CHEMICALS','FEATURE_EMERGENCY_CIPA','FEATURE_CONTRACTORS','FEATURE_CLIENT_PORTAL_PLUS','FEATURE_ESOCIAL_TRANSMISSION','FEATURE_BILLING'])assert.match(env,new RegExp(`${flag}: booleanFromString\\.default\\(false\\)`));
});

test('cobrança registra uso e webhooks idempotentes',()=>{
  assert.match(billing,/billingUsageRecord\.upsert/); assert.match(billing,/paymentWebhookEvent/); assert.match(billing,/providerInvoiceId/);
  assert.match(schema,/@@unique\(\[provider, externalId\]\)/);
});
