import type { MembershipRole } from '@prisma/client';
import { operationalToolCatalog, operationalToolDefinitions } from '@/domain/ai/operational-tools';
import { loadActiveAIConfiguration } from './ai-config';
import { prepareOperationalTool, planToolExecution, runToolExecution, type ToolActor } from './ai-tools';
import { createAIProviderClient } from './integrations/ai';
import { db } from './db';
import { toPrismaJson } from './prisma-json';
import { audit } from './audit';
import { saveFile } from './files';
import { attachmentKindForMime } from '@/domain/field/validation';

export type CopilotActor = {
  tenantId: string;
  userId: string;
  role: MembershipRole;
  permissionOverrides: unknown;
};

const compactJson = (value: unknown, max = 12000) => {
  const serialized = JSON.stringify(value);
  return serialized.length <= max ? serialized : `${serialized.slice(0, max)}…`;
};

async function enforceUsageLimit(tenantId: string, dailyLimit: number) {
  if (dailyLimit <= 0) return;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const requests = await db.aIUsageRecord.count({ where: { tenantId, createdAt: { gte: start } } });
  if (requests >= dailyLimit) throw new Error(`Limite diário de IA atingido (${dailyLimit} solicitações)`);
}

export async function createCopilotThread(input: CopilotActor & { title?: string; companyId?: string | null; workProjectId?: string | null; preferredProvider?: 'OPENAI' | 'GEMINI' }) {
  const configuration = await loadActiveAIConfiguration(input.tenantId, input.preferredProvider);
  if (!configuration) throw new Error('Nenhum provedor de IA ativo e configurado');
  if (!configuration.settings.capabilities.tools) throw new Error('O provedor ativo não está habilitado para ferramentas');
  let companyId = input.companyId ?? null;
  let workProjectId = input.workProjectId ?? null;
  let defaultTitle = 'Nova conversa com o copiloto';
  if (workProjectId) {
    const project = await db.workProject.findFirst({ where: { id: workProjectId, tenantId: input.tenantId }, select: { id: true, companyId: true, title: true } });
    if (!project) throw new Error('Trabalho SST não encontrado');
    companyId = project.companyId;
    defaultTitle = `Copiloto — ${project.title}`;
  } else if (companyId) {
    const company = await db.company.findFirst({ where: { id: companyId, tenantId: input.tenantId, status: 'ACTIVE' }, select: { id: true, legalName: true, tradeName: true } });
    if (!company) throw new Error('Empresa não encontrada');
    defaultTitle = `Copiloto — ${company.tradeName ?? company.legalName}`;
  }
  const model = configuration.settings.modelEconomy || configuration.settings.modelAdvanced;
  const thread = await db.aIThread.create({
    data: {
      tenantId: input.tenantId,
      companyId,
      workProjectId,
      createdById: input.userId,
      title: input.title?.trim().slice(0, 180) || defaultTitle,
      provider: configuration.provider,
      model,
      autonomy: configuration.settings.autonomy,
      context: toPrismaJson({ dataPolicy: configuration.settings.dataPolicy, providerSettingsVersion: 1 }),
    },
  });
  await audit({ tenantId: input.tenantId, companyId: companyId ?? undefined, userId: input.userId, action: 'AI_THREAD_CREATED', entityType: 'AIThread', entityId: thread.id, after: { title: thread.title, provider: thread.provider, model: thread.model, autonomy: thread.autonomy, workProjectId } });
  return thread;
}

function systemInstruction(input: { thread: { autonomy: string; companyId: string | null; workProjectId: string | null }; dataPolicy: string }) {
  return [
    'Você é o Copiloto Operacional da Plataforma SST.',
    'Seu papel é conduzir trabalhos de SST usando somente as ferramentas fornecidas pela aplicação.',
    'Nunca invente IDs, medições, resultados, datas, quantidades, conclusões médicas ou conclusões técnicas.',
    'Antes de criar algo, localize a empresa e consulte a estrutura quando isso for necessário.',
    'Use ferramentas de consulta para responder com dados reais. Não alegue ter executado uma ação sem resultado de ferramenta.',
    'Quando uma ação depender de aprovação, explique claramente o que foi preparado e aguarde a decisão humana.',
    'Não assine, não libere documento final e não substitua responsabilidade profissional.',
    `Autonomia atual: ${input.thread.autonomy}. Política de dados: ${input.dataPolicy}.`,
    input.thread.companyId ? `Contexto fixo da empresa: ${input.thread.companyId}.` : 'Nenhuma empresa fixa selecionada.',
    input.thread.workProjectId ? `Contexto fixo do Trabalho SST: ${input.thread.workProjectId}.` : 'Nenhum Trabalho SST fixo selecionado.',
    'Responda em português do Brasil, com passos objetivos e indique pendências sem ocultá-las.',
  ].join('\n');
}

async function transcriptForThread(threadId: string) {
  const messages = await db.aIMessage.findMany({ where: { aiThreadId: threadId }, include: { attachments: { include: { file: { select: { originalName: true, mimeType: true } } } } }, orderBy: { createdAt: 'desc' }, take: 30 });
  return messages.reverse().map((message) => {
    const attachments = message.attachments.length ? `\n[Anexos: ${message.attachments.map((item) => `${item.file.originalName} (${item.file.mimeType})`).join(', ')}]` : '';
    return `${message.role}: ${message.content}${attachments}`;
  }).join('\n\n');
}

export async function sendCopilotMessage(input: CopilotActor & { threadId: string; content: string; attachments?: Array<{ name: string; mimeType: string; data: Buffer }>; dataAuthorized?: boolean }) {
  const content = input.content.trim().slice(0, 20000);
  if (!content) throw new Error('Mensagem vazia');
  const thread = await db.aIThread.findFirst({ where: { id: input.threadId, tenantId: input.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } } });
  if (!thread) throw new Error('Conversa não encontrada');
  const configuration = await loadActiveAIConfiguration(input.tenantId, thread.provider === 'OPENAI' || thread.provider === 'GEMINI' ? thread.provider : undefined);
  if (!configuration) throw new Error('O provedor usado nesta conversa não está mais disponível');
  if (!configuration.settings.capabilities.tools) throw new Error('Ferramentas não estão habilitadas no provedor');
  await enforceUsageLimit(input.tenantId, configuration.settings.dailyRequestLimit);
  const uploads = input.attachments ?? [];
  if (uploads.length && !input.dataAuthorized) throw new Error('Confirme a autorização e a revisão de dados pessoais antes de enviar anexos');
  const userMessage = await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'USER', content } });
  const aiFiles: Array<{ filename: string; mimeType: string; data: Buffer }> = [];
  const attachmentIds: string[] = [];
  for (const upload of uploads) {
    const saved = await saveFile({ tenantId: input.tenantId, companyId: thread.companyId ?? undefined, originalName: upload.name, mimeType: upload.mimeType, data: upload.data, createdById: input.userId, metadata: { source: 'AI_COPILOT_ATTACHMENT', aiThreadId: thread.id, aiMessageId: userMessage.id } });
    const attachment = await db.aIMessageAttachment.create({ data: { aiMessageId: userMessage.id, fileObjectId: saved.id, kind: attachmentKindForMime(upload.mimeType), status: 'UPLOADED', metadata: toPrismaJson({ dataAuthorized: true }) } });
    attachmentIds.push(attachment.id);
    aiFiles.push({ filename: upload.name, mimeType: upload.mimeType, data: upload.data });
  }
  if (attachmentIds.length) await db.aIMessageAttachment.updateMany({ where: { id: { in: attachmentIds } }, data: { status: 'ANALYZING' } });
  const client = createAIProviderClient({ provider: configuration.provider, model: thread.model, apiKey: configuration.apiKey });
  const actor: ToolActor = {
    tenantId: input.tenantId,
    userId: input.userId,
    role: input.role,
    permissionOverrides: input.permissionOverrides,
    autonomy: thread.autonomy,
    dataPolicy: configuration.settings.dataPolicy,
    aiThreadId: thread.id,
    workProjectId: thread.workProjectId,
  };
  const definitions = thread.autonomy === 'ASSISTANT'
    ? operationalToolCatalog.filter((item) => !item.mutating).map((item) => item.definition)
    : operationalToolDefinitions();
  let finalText = '';
  let completedActions = 0;
  let pendingApprovals = 0;
  let failures = 0;

  try {
  for (let round = 0; round < 3; round += 1) {
    const transcript = await transcriptForThread(thread.id);
    const response = await client.complete({
      system: systemInstruction({ thread, dataPolicy: configuration.settings.dataPolicy }),
      prompt: `${transcript}\n\nContinue a conversa. Analise os anexos somente como evidências auxiliares; não invente medições ou conclusões. Use ferramentas quando precisar consultar ou executar ações reais.`,
      files: round === 0 && aiFiles.length ? aiFiles : undefined,
      tools: definitions,
      toolChoice: 'auto',
      maxOutputTokens: 2200,
    });
    await db.aIUsageRecord.create({ data: { tenantId: input.tenantId, workProjectId: thread.workProjectId, aiThreadId: thread.id, userId: input.userId, provider: configuration.provider, model: thread.model, purpose: 'COPILOT_MESSAGE', inputTokens: response.inputTokens, outputTokens: response.outputTokens, metadata: toPrismaJson({ round, providerResponseId: response.providerResponseId ?? null }) } });
    if (response.text) {
      finalText = response.text;
      await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'ASSISTANT', content: response.text, providerMessageId: response.providerResponseId, inputTokens: response.inputTokens, outputTokens: response.outputTokens } });
    }
    if (!response.toolCalls.length) break;

    let producedImmediateResult = false;
    for (const call of response.toolCalls.slice(0, 8)) {
      try {
        const prepared = await prepareOperationalTool(call.name, call.arguments, actor);
        const plan = await planToolExecution({ prepared, actor, toolCallId: call.id });
        if (prepared.approvalRequired) {
          pendingApprovals += 1;
          await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'TOOL', toolName: prepared.name, toolCallId: call.id, content: compactJson({ status: 'WAITING_APPROVAL', approvalRequestId: plan.approval?.id, summary: prepared.summary, riskLevel: prepared.riskLevel }) } });
          continue;
        }
        const execution = await runToolExecution(plan.execution.id, actor);
        const result = execution.result && typeof execution.result === 'object' ? execution.result : { status: execution.status };
        await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'TOOL', toolName: prepared.name, toolCallId: call.id, content: compactJson(result) } });
        completedActions += 1;
        producedImmediateResult = true;
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'TOOL', toolName: call.name, toolCallId: call.id, content: compactJson({ status: 'REJECTED_OR_FAILED', error: message }) } });
      }
    }
    if (!producedImmediateResult) break;
  }
  if (attachmentIds.length) await db.aIMessageAttachment.updateMany({ where: { id: { in: attachmentIds } }, data: { status: 'READY', analyzedAt: new Date() } });
  } catch (error) {
    if (attachmentIds.length) await db.aIMessageAttachment.updateMany({ where: { id: { in: attachmentIds } }, data: { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000) } });
    throw error;
  }

  if (!finalText) {
    finalText = pendingApprovals
      ? `Preparei ${pendingApprovals} ação(ões) para sua aprovação antes de executar.`
      : completedActions
        ? `Concluí ${completedActions} ação(ões) e registrei os resultados na conversa.`
        : failures
          ? 'Não consegui concluir as ações solicitadas. Verifique os detalhes registrados na conversa.'
          : 'Não encontrei uma ação executável para esta solicitação.';
    await db.aIMessage.create({ data: { aiThreadId: thread.id, role: 'ASSISTANT', content: finalText, metadata: toPrismaJson({ generatedLocally: true }) } });
  }
  await db.aIThread.update({ where: { id: thread.id }, data: { status: 'ACTIVE', updatedAt: new Date() } });
  await audit({ tenantId: input.tenantId, companyId: thread.companyId ?? undefined, userId: input.userId, action: 'AI_COPILOT_MESSAGE_PROCESSED', entityType: 'AIThread', entityId: thread.id, after: { completedActions, pendingApprovals, failures, attachments: attachmentIds.length }, metadata: { workProjectId: thread.workProjectId } });
  return { threadId: thread.id, finalText, completedActions, pendingApprovals, failures };
}
