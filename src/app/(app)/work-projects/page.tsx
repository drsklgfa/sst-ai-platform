import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { Badge, Card } from '@/components/ui';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'COMPLETED' ? 'success' : ['WAITING_INPUT', 'WAITING_APPROVAL', 'IN_REVIEW'].includes(status) ? 'warning' : ['CANCELLED'].includes(status) ? 'danger' : 'neutral';

export default async function WorkProjectsPage() {
  if (!env.FEATURE_V10_WORKS) notFound();
  const { tenant } = await requireTenantPermission('company.read');
  const projects = await db.workProject.findMany({
    where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } },
    include: {
      company: { select: { legalName: true, tradeName: true } },
      _count: { select: { steps: true, requirements: true, approvals: true } },
      approvals: { where: { status: 'PENDING' }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm text-brand-700">Versão 10</p><h1 className="text-3xl font-bold">Trabalhos SST</h1><p className="text-slate-500">Central única de serviços, etapas, pendências, aprovações e documentos.</p></div>
      <Link href="/work-projects/new" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Novo trabalho</Link>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => <Link href={`/work-projects/${project.id}`} key={project.id}>
        <Card className="h-full transition hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand-700">{project.serviceType}</p><h2 className="font-bold">{project.title}</h2><p className="text-sm text-slate-500">{project.company.tradeName ?? project.company.legalName}</p></div><Badge tone={tone(project.status)}>{project.status}</Badge></div>
          <div className="mt-5"><div className="flex justify-between text-xs text-slate-500"><span>Progresso</span><span>{project.progress}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${project.progress}%` }} /></div></div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span>{project._count.steps} etapas</span><span>{project._count.requirements} requisitos</span>{project.approvals.length > 0 && <span className="font-semibold text-amber-700">{project.approvals.length} aprovações</span>}</div>
        </Card>
      </Link>)}
      {!projects.length && <Card><p className="font-medium">Nenhum trabalho criado.</p><p className="mt-1 text-sm text-slate-500">Crie o primeiro trabalho para testar o novo motor sem alterar os módulos atuais.</p></Card>}
    </div>
  </div>;
}
