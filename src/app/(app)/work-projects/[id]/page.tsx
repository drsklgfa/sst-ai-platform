import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { Badge, Button, Card, Input } from '@/components/ui';

const stepTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => ['COMPLETED', 'NOT_APPLICABLE'].includes(status) ? 'success' : status === 'BLOCKED' ? 'danger' : status === 'IN_PROGRESS' ? 'warning' : 'neutral';
const requirementTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => ['SATISFIED', 'WAIVED'].includes(status) ? 'success' : status === 'BLOCKED' ? 'danger' : 'neutral';

export default async function WorkProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_V10_WORKS) notFound();
  const { id } = await params;
  const { tenant } = await requireTenantPermission('company.read');
  const project = await db.workProject.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      company: { select: { id: true, legalName: true, tradeName: true } },
      workflowTemplate: { select: { name: true, version: true } },
      steps: { include: { requirements: { orderBy: { createdAt: 'asc' } } }, orderBy: { position: 'asc' } },
      approvals: { orderBy: { createdAt: 'desc' }, take: 10 },
      changeSets: { orderBy: { createdAt: 'desc' }, take: 10 },
      aiThreads: { orderBy: { updatedAt: 'desc' }, take: 5 },
      fieldVisits: { include: { _count: { select: { captures: true } } }, orderBy: { updatedAt: 'desc' }, take: 10 },
    },
  });
  if (!project) notFound();

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-brand-700">{project.serviceType}</p><h1 className="text-3xl font-bold">{project.title}</h1><p className="text-slate-500"><Link href={`/companies/${project.company.id}`} className="hover:underline">{project.company.tradeName ?? project.company.legalName}</Link>{project.workflowTemplate ? ` · fluxo ${project.workflowTemplate.version}` : ''}</p></div><div className="flex items-center gap-2">{env.FEATURE_ERGONOMICS && ['AET', 'AEP'].includes(project.serviceType) && <Link href={`/ergonomics/${project.id}`} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900">Abrir AEP/AET</Link>}{env.FEATURE_PGR_GRO && project.serviceType === 'PGR' && <Link href={`/pgr/${project.id}`} className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800">Abrir GRO/PGR</Link>}{env.FEATURE_PCMSO && project.serviceType === 'PCMSO' && <Link href={`/pcmso/${project.id}`} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">Abrir PCMSO</Link>}{env.FEATURE_OCCUPATIONAL_HYGIENE && project.serviceType === 'HIGIENE_OCUPACIONAL' && <Link href={`/hygiene/${project.id}`} className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-900">Abrir higiene ocupacional</Link>}{env.FEATURE_CORPORATE_UNIVERSITY && project.serviceType === 'TREINAMENTO' && <Link href={`/training/${project.id}`} className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900">Abrir universidade corporativa</Link>}{env.FEATURE_OPERATIONAL_SST && project.serviceType === 'OPERACAO_SST' && <Link href={`/operations/${project.id}`} className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900">Abrir Operação SST 360</Link>}{env.FEATURE_EXPOSURE_CORE && ['LTCAT', 'INSALUBRIDADE', 'PERICULOSIDADE'].includes(project.serviceType) && <Link href={`/exposures/${project.id}`} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">Abrir exposições</Link>}{env.FEATURE_FIELD_OPERATIONS && <Link href={`/field-visits?companyId=${project.company.id}&workProjectId=${project.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800">Iniciar visita</Link>}{env.FEATURE_AI_COPILOT && <Link href={`/copilot?workProjectId=${project.id}`} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Conversar com o copiloto</Link>}<Badge tone={project.status === 'COMPLETED' ? 'success' : 'neutral'}>{project.status}</Badge></div></div>
    <Card className="mt-6"><div className="flex justify-between text-sm"><span className="font-semibold">Progresso geral</span><span>{project.progress}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600" style={{ width: `${project.progress}%` }} /></div><p className="mt-3 text-xs text-slate-500">Responsável interno: {project.responsibleUserId ? 'definido' : 'não definido'}{project.dueAt ? ` · prazo ${project.dueAt.toLocaleDateString('pt-BR')}` : ''}</p></Card>

    <div className="mt-6 grid gap-5">
      {project.steps.map((step) => <Card key={step.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Etapa {step.position}</p><h2 className="text-lg font-bold">{step.title}</h2>{step.description && <p className="text-sm text-slate-500">{step.description}</p>}</div><Badge tone={stepTone(step.status)}>{step.status}</Badge></div>
        <div className="mt-4 divide-y">
          {step.requirements.map((item) => <div key={item.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{item.title}</p>{item.description && <p className="text-xs text-slate-500">{item.description}</p>}{item.justification && <p className="mt-1 text-xs text-amber-700">Justificativa: {item.justification}</p>}</div><Badge tone={requirementTone(item.status)}>{item.status}</Badge></div>
            <div className="mt-2 flex flex-wrap gap-2"><form action={`/api/work-projects/${project.id}/requirements/${item.id}`} method="post"><input type="hidden" name="status" value="SATISFIED" /><Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">Confirmar</Button></form><form action={`/api/work-projects/${project.id}/requirements/${item.id}`} method="post"><input type="hidden" name="status" value="PENDING" /><Button type="submit" variant="ghost" className="px-3 py-1.5 text-xs">Reabrir</Button></form></div>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><form action={`/api/work-projects/${project.id}/steps/${step.id}`} method="post"><input type="hidden" name="status" value="COMPLETED" /><Button type="submit" variant="secondary">Concluir etapa</Button></form><form action={`/api/work-projects/${project.id}/steps/${step.id}`} method="post" className="flex min-w-[320px] flex-1 gap-2"><input type="hidden" name="status" value="NOT_APPLICABLE" /><Input name="notApplicableReason" required minLength={10} placeholder="Justificativa para não aplicável" /><Button type="submit" variant="outline">Dispensar</Button></form></div>
      </Card>)}
    </div>

    {env.FEATURE_FIELD_OPERATIONS && <Card className="mt-6"><div className="flex items-center justify-between"><h2 className="font-bold">Coletas em campo</h2><Link href={`/field-visits?companyId=${project.company.id}&workProjectId=${project.id}`} className="text-sm font-semibold text-brand-700">Nova visita</Link></div><div className="mt-3 divide-y">{project.fieldVisits.map((visit) => <Link key={visit.id} href={`/field-visits/${visit.id}`} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{visit.title}</p><p className="text-xs text-slate-500">{visit._count.captures} registros · {visit.progress}% do checklist</p></div><Badge tone={visit.status === 'REVIEWED' || visit.status === 'COMPLETED' ? 'success' : 'warning'}>{visit.status}</Badge></Link>)}{!project.fieldVisits.length && <p className="py-3 text-sm text-slate-500">Nenhuma visita vinculada a este trabalho.</p>}</div></Card>}

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card><h2 className="font-bold">Aprovações</h2><div className="mt-3 divide-y">{project.approvals.map((approval) => <div key={approval.id} className="flex justify-between gap-3 py-3"><div><p className="text-sm font-medium">{approval.summary}</p><p className="text-xs text-slate-500">{approval.action} · {approval.riskLevel}</p></div><Badge tone={approval.status === 'APPROVED' ? 'success' : approval.status === 'REJECTED' ? 'danger' : 'warning'}>{approval.status}</Badge></div>)}{!project.approvals.length && <p className="py-3 text-sm text-slate-500">Nenhuma aprovação pendente.</p>}</div></Card><Card><h2 className="font-bold">Alterações da IA</h2><div className="mt-3 divide-y">{project.changeSets.map((changeSet) => <div key={changeSet.id} className="flex justify-between gap-3 py-3"><div><p className="text-sm font-medium">{changeSet.summary}</p><p className="text-xs text-slate-500">{changeSet.createdAt.toLocaleString('pt-BR')}</p></div><Badge>{changeSet.status}</Badge></div>)}{!project.changeSets.length && <p className="py-3 text-sm text-slate-500">Nenhum conjunto de alterações registrado.</p>}</div></Card></div>
  </div>;
}
