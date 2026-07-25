import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, Input } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { loadTenantAIConfigurations } from '@/lib/ai-config';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export default async function CopilotPage({ searchParams }: { searchParams: Promise<{ error?: string; companyId?: string; workProjectId?: string }> }) {
  if (!env.FEATURE_AI_COPILOT) notFound();
  const { tenant } = await requireTenantPermission('work.manage');
  const query = await searchParams;
  const [threads, companies, projects, configurations] = await Promise.all([
    db.aIThread.findMany({ where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } }, include: { company: { select: { legalName: true, tradeName: true } }, workProject: { select: { title: true } }, _count: { select: { messages: true, toolExecutions: true } } }, orderBy: { updatedAt: 'desc' }, take: 50 }),
    db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, select: { id: true, legalName: true, tradeName: true }, orderBy: { legalName: 'asc' }, take: 500 }),
    db.workProject.findMany({ where: { tenantId: tenant.id, status: { in: ['DRAFT', 'ACTIVE', 'WAITING_INPUT', 'WAITING_APPROVAL', 'IN_REVIEW'] } }, select: { id: true, companyId: true, title: true, serviceType: true }, orderBy: { updatedAt: 'desc' }, take: 300 }),
    loadTenantAIConfigurations(tenant.id),
  ]);
  const active = configurations.filter((item) => item.enabled && item.hasSecret && item.settings.capabilities.tools);

  return <div>
    <div><p className="text-sm font-semibold text-brand-700">Checkpoint 10.2</p><h1 className="text-3xl font-bold">Copiloto Operacional</h1><p className="text-slate-500">Converse com a plataforma e execute ações reais usando ferramentas controladas.</p></div>
    {query.error && <Card className="mt-5 border-rose-200 bg-rose-50"><p className="text-sm text-rose-800">{decodeURIComponent(query.error)}</p></Card>}
    {!active.length && <Card className="mt-5 border-amber-200 bg-amber-50"><p className="font-semibold text-amber-900">Nenhum provedor com ferramentas está ativo.</p><p className="mt-1 text-sm text-amber-800">Ative OpenAI ou Gemini em Configurações → IA e marque a capacidade de ferramentas.</p><Link href="/settings/ai" className="mt-3 inline-block text-sm font-semibold text-brand-700">Abrir configurações</Link></Card>}

    <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card>
        <h2 className="text-lg font-bold">Nova conversa</h2>
        <form action="/api/copilot/threads" method="post" className="mt-4 grid gap-3">
          <label className="text-sm font-medium">Título opcional<Input name="title" className="mt-1" placeholder="Ex.: Preparar AET da Empresa X" /></label>
          <label className="text-sm font-medium">Provedor<select name="provider" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Automático</option>{active.map((item) => <option key={item.provider} value={item.provider}>{item.provider} · {item.settings.autonomy}</option>)}</select></label>
          <label className="text-sm font-medium">Empresa<select name="companyId" defaultValue={query.companyId ?? ''} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Sem empresa fixa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName ?? company.legalName}</option>)}</select></label>
          <label className="text-sm font-medium">Trabalho SST<select name="workProjectId" defaultValue={query.workProjectId ?? ''} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Sem trabalho fixo</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.serviceType} · {project.title}</option>)}</select></label>
          <Button type="submit" disabled={!active.length}>Criar conversa</Button>
        </form>
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><p className="font-semibold">Exemplos</p><p className="mt-1">“Encontre a Empresa X e diga o que falta para o PGR.”</p><p>“Crie uma AET e prepare as próximas etapas.”</p><p>“Cadastre o setor Produção na unidade principal.”</p></div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {threads.map((thread) => <Link href={`/copilot/${thread.id}`} key={thread.id}><Card className="h-full transition hover:-translate-y-0.5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{thread.title}</h2><p className="text-sm text-slate-500">{thread.workProject?.title ?? thread.company?.tradeName ?? thread.company?.legalName ?? 'Contexto geral'}</p></div><Badge tone={thread.status === 'ACTIVE' ? 'success' : 'neutral'}>{thread.status}</Badge></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span>{thread.provider}</span><span>{thread.model}</span><span>{thread.autonomy}</span></div><div className="mt-3 text-xs text-slate-500">{thread._count.messages} mensagens · {thread._count.toolExecutions} ferramentas</div></Card></Link>)}
        {!threads.length && <Card><p className="font-medium">Nenhuma conversa criada.</p><p className="mt-1 text-sm text-slate-500">Crie uma conversa vinculada a uma empresa ou Trabalho SST.</p></Card>}
      </div>
    </div>
  </div>;
}
