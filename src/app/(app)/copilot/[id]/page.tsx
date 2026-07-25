import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const messageClass = (role: string) => role === 'USER' ? 'ml-auto bg-brand-600 text-white' : role === 'ASSISTANT' ? 'mr-auto bg-white border border-slate-200' : 'mx-auto bg-slate-100 text-slate-700';
const statusTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'SUCCEEDED' || status === 'APPROVED' || status === 'APPLIED' ? 'success' : status === 'FAILED' || status === 'REJECTED' ? 'danger' : status === 'WAITING_APPROVAL' || status === 'PENDING' ? 'warning' : 'neutral';

export default async function CopilotThreadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  if (!env.FEATURE_AI_COPILOT) notFound();
  const { id } = await params;
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('work.manage');
  const thread = await db.aIThread.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      company: { select: { id: true, legalName: true, tradeName: true } },
      workProject: { select: { id: true, title: true, progress: true, status: true } },
      messages: { include: { attachments: { include: { file: true } } }, orderBy: { createdAt: 'asc' }, take: 150 },
      toolExecutions: { include: { approvalRequest: true, changeSet: true }, orderBy: { createdAt: 'desc' }, take: 40 },
    },
  });
  if (!thread) notFound();
  const pendingApprovals = thread.toolExecutions.filter((execution) => execution.status === 'WAITING_APPROVAL' && execution.approvalRequest?.status === 'PENDING');
  const appliedChanges = thread.toolExecutions.filter((execution) => execution.changeSet?.status === 'APPLIED');

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/copilot" className="text-sm font-semibold text-brand-700">← Conversas</Link><h1 className="mt-1 text-3xl font-bold">{thread.title}</h1><p className="text-slate-500">{thread.company ? <Link href={`/companies/${thread.company.id}`} className="hover:underline">{thread.company.tradeName ?? thread.company.legalName}</Link> : 'Contexto geral'}{thread.workProject ? <> · <Link href={`/work-projects/${thread.workProject.id}`} className="hover:underline">{thread.workProject.title}</Link></> : null}</p></div><div className="flex flex-wrap gap-2"><Badge>{thread.provider}</Badge><Badge>{thread.model}</Badge><Badge tone={thread.autonomy === 'SUPERVISED_AUTONOMY' ? 'warning' : 'neutral'}>{thread.autonomy}</Badge></div></div>
    {query.error && <Card className="mt-5 border-rose-200 bg-rose-50"><p className="text-sm text-rose-800">{decodeURIComponent(query.error)}</p></Card>}
    {thread.workProject && <Card className="mt-5"><div className="flex justify-between text-sm"><span className="font-semibold">{thread.workProject.status}</span><span>{thread.workProject.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${thread.workProject.progress}%` }} /></div></Card>}

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">
      <div>
        <Card className="min-h-[520px] bg-slate-50">
          <div className="space-y-3">
            {thread.messages.filter((message) => message.role !== 'TOOL').map((message) => <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${messageClass(message.role)}`}><p className="mb-1 text-[10px] font-semibold uppercase opacity-70">{message.role === 'USER' ? 'Você' : message.role === 'ASSISTANT' ? 'Copiloto' : message.role}</p>{message.content}{message.attachments.length > 0 && <div className="mt-3 space-y-2 border-t border-current/20 pt-2">{message.attachments.map((attachment) => <a key={attachment.id} href={`/api/files/local?key=${encodeURIComponent(attachment.file.storageKey)}`} target="_blank" rel="noreferrer" className="block rounded-lg bg-black/5 px-2 py-1.5 text-xs font-semibold underline">{attachment.file.originalName} · {attachment.status}</a>)}</div>}</div>)}
            {!thread.messages.length && <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Descreva o que precisa fazer. O copiloto pesquisará os dados existentes e preparará ações controladas.</div>}
          </div>
        </Card>
        <Card className="mt-4"><form action={`/api/copilot/threads/${thread.id}/messages`} method="post" encType="multipart/form-data"><Textarea name="content" required minLength={2} maxLength={20000} rows={5} placeholder="Ex.: Encontre a empresa, crie a AET usando os dados existentes e me diga somente o que falta." />{env.FEATURE_MULTIMODAL_INPUT && <div className="mt-3 grid gap-2"><label className="text-xs font-semibold text-slate-600">Anexos multimodais<input type="file" name="files" multiple accept="image/*,audio/*,application/pdf,.docx,.xlsx,.csv,.txt" className="mt-1 block w-full text-xs" /></label><label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><input type="checkbox" name="dataAuthorized" value="yes" className="mt-0.5" />Confirmo que revisei os dados pessoais e possuo base/autorização adequada para enviar estes arquivos ao provedor de IA configurado.</label></div>}<div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Ações relevantes aparecem na coluna de aprovações antes de serem executadas.</p><Button type="submit">Enviar</Button></div></form></Card>
      </div>

      <div className="space-y-5">
        <Card><div className="flex items-center justify-between"><h2 className="font-bold">Aprovações</h2>{pendingApprovals.length > 0 && <Badge tone="warning">{pendingApprovals.length}</Badge>}</div><div className="mt-3 divide-y">{pendingApprovals.map((execution) => <div key={execution.id} className="py-4"><p className="text-sm font-semibold">{execution.approvalRequest?.summary}</p><p className="mt-1 text-xs text-slate-500">{execution.toolName} · {execution.riskLevel}</p><details className="mt-2"><summary className="cursor-pointer text-xs text-brand-700">Ver parâmetros</summary><pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] text-slate-100">{JSON.stringify(execution.arguments, null, 2)}</pre></details><form action={`/api/copilot/approvals/${execution.approvalRequest?.id}`} method="post" className="mt-3 grid gap-2"><Textarea name="note" rows={2} placeholder="Observação opcional" /><div className="flex gap-2"><Button type="submit" name="operation" value="approve" className="flex-1">Aprovar</Button><Button type="submit" name="operation" value="reject" variant="danger" className="flex-1">Rejeitar</Button></div></form></div>)}{!pendingApprovals.length && <p className="py-3 text-sm text-slate-500">Nenhuma ação aguardando aprovação.</p>}</div></Card>

        <Card><h2 className="font-bold">Execuções recentes</h2><div className="mt-3 divide-y">{thread.toolExecutions.slice(0, 15).map((execution) => <div key={execution.id} className="flex items-start justify-between gap-3 py-3"><div><p className="text-sm font-medium">{execution.toolName}</p><p className="text-xs text-slate-500">{execution.error ?? execution.createdAt.toLocaleString('pt-BR')}</p></div><Badge tone={statusTone(execution.status)}>{execution.status}</Badge></div>)}{!thread.toolExecutions.length && <p className="py-3 text-sm text-slate-500">Nenhuma ferramenta chamada.</p>}</div></Card>

        <Card><h2 className="font-bold">Alterações reversíveis</h2><div className="mt-3 divide-y">{appliedChanges.map((execution) => <div key={execution.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{execution.changeSet?.summary}</p><p className="text-xs text-slate-500">{execution.completedAt?.toLocaleString('pt-BR')}</p></div><Badge tone="success">APPLIED</Badge></div><form action={`/api/copilot/change-sets/${execution.changeSet?.id}/revert`} method="post" className="mt-2"><Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">Desfazer com segurança</Button></form></div>)}{!appliedChanges.length && <p className="py-3 text-sm text-slate-500">Nenhuma alteração aplicada nesta conversa.</p>}</div></Card>
      </div>
    </div>
  </div>;
}
