import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, Input } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'COMPLETED' || status === 'REVIEWED' ? 'success' : status === 'IN_PROGRESS' || status === 'PAUSED' ? 'warning' : status === 'CANCELLED' ? 'danger' : 'neutral';

export default async function FieldVisitsPage({ searchParams }: { searchParams: Promise<{ error?: string; companyId?: string; workProjectId?: string }> }) {
  if (!env.FEATURE_FIELD_OPERATIONS) notFound();
  const query = await searchParams;
  const { tenant } = await requireTenantPermission('inspection.manage');
  const [visits, companies, projects] = await Promise.all([
    db.fieldVisit.findMany({ where: { tenantId: tenant.id }, include: { company: { select: { legalName: true, tradeName: true } }, workProject: { select: { title: true, serviceType: true } }, _count: { select: { captures: true } } }, orderBy: { updatedAt: 'desc' }, take: 100 }),
    db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, select: { id: true, legalName: true, tradeName: true }, orderBy: { legalName: 'asc' } }),
    db.workProject.findMany({ where: { tenantId: tenant.id, status: { notIn: ['CANCELLED', 'ARCHIVED'] } }, select: { id: true, companyId: true, title: true, serviceType: true }, orderBy: { updatedAt: 'desc' }, take: 200 }),
  ]);

  return <div>
    <div><p className="text-sm font-semibold text-brand-700">Operação móvel</p><h1 className="text-3xl font-bold">Coleta em campo</h1><p className="mt-1 text-slate-500">Fotos, voz, documentos, notas e medições organizados por empresa e Trabalho SST.</p></div>
    {query.error && <Card className="mt-5 border-rose-200 bg-rose-50"><p className="text-sm text-rose-800">{decodeURIComponent(query.error)}</p></Card>}
    <Card className="mt-6"><h2 className="font-bold">Iniciar visita técnica</h2><form action="/api/field-visits" method="post" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm">Empresa<select name="companyId" required defaultValue={query.companyId ?? ''} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName ?? company.legalName}</option>)}</select></label><label className="text-sm">Trabalho SST<select name="workProjectId" defaultValue={query.workProjectId ?? ''} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Visita geral</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.serviceType} · {project.title}</option>)}</select></label><label className="text-sm">Título<Input className="mt-1" name="title" maxLength={180} placeholder="Visita à produção" /></label><div className="flex items-end"><Button type="submit" className="w-full">Iniciar coleta</Button></div></form><p className="mt-3 text-xs text-slate-500">A vinculação entre empresa e trabalho é validada no servidor; um trabalho de outra empresa não pode ser selecionado por manipulação do formulário.</p></Card>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{visits.map((visit) => <Link key={visit.id} href={`/field-visits/${visit.id}`}><Card className="h-full transition hover:border-brand-300"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand-700">{visit.workProject?.serviceType ?? 'VISITA GERAL'}</p><h2 className="font-bold">{visit.title}</h2><p className="text-sm text-slate-500">{visit.company.tradeName ?? visit.company.legalName}</p></div><Badge tone={tone(visit.status)}>{visit.status}</Badge></div><div className="mt-4 flex justify-between text-xs text-slate-500"><span>{visit._count.captures} registros</span><span>{visit.progress}% do checklist</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${visit.progress}%` }} /></div></Card></Link>)}{!visits.length && <Card><p className="text-sm text-slate-500">Nenhuma visita de campo iniciada.</p></Card>}</div>
  </div>;
}
