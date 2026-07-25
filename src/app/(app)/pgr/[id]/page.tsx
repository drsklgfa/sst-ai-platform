import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const riskTone = (level: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (['CRITICAL', 'HIGH'].includes(level)) return 'danger';
  if (level === 'MODERATE') return 'warning';
  if (['VERY_LOW', 'LOW'].includes(level)) return 'success';
  return 'neutral';
};
const auditTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'PASSED' ? 'success' : status === 'PASSED_WITH_WARNINGS' ? 'warning' : 'danger';
const jsonList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export default async function PgrPage({ params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_PGR_GRO) notFound();
  const { id } = await params;
  const { tenant } = await requireTenantPermission('company.read');
  const project = await db.workProject.findFirst({
    where: { id, tenantId: tenant.id, serviceType: 'PGR' },
    include: {
      company: {
        include: {
          establishments: {
            where: { active: true },
            include: { sectors: { where: { active: true }, include: { ghes: { where: { active: true } } } } },
          },
          campaigns: { where: { status: { in: ['ACTIVE', 'CLOSED', 'REOPENED'] } }, orderBy: { updatedAt: 'desc' } },
        },
      },
      pgrProgram: {
        include: {
          riskAssessments: { include: { ghe: { select: { name: true, sector: { select: { name: true } } } } }, orderBy: [{ initialLevel: 'desc' }, { code: 'asc' }] },
          participationRecords: { orderBy: { occurredAt: 'desc' } },
          psychosocialAssessments: { include: { findings: true, campaign: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
          audits: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
    },
  });
  if (!project) notFound();
  const program = project.pgrProgram;
  const ghes = project.company.establishments.flatMap((establishment) => establishment.sectors.flatMap((sector) => sector.ghes.map((ghe) => ({ ...ghe, label: `${establishment.name} · ${sector.name} · ${ghe.name}` }))));

  if (!program) return <div>
    <p className="text-sm font-semibold text-brand-700">GRO/PGR</p>
    <h1 className="text-3xl font-bold">{project.title}</h1>
    <p className="mt-1 text-slate-500">Crie a estrutura operacional do PGR vinculada ao Trabalho SST.</p>
    <Card className="mt-6"><h2 className="font-bold">Inicializar PGR</h2><p className="mt-2 text-sm text-slate-600">Serão criados critérios versionados, ciclo de revisão e estrutura para inventário, participação, psicossocial e auditoria.</p><form className="mt-4" action={`/api/pgr/${project.id}/bootstrap`} method="post"><Button type="submit">Inicializar programa</Button></form></Card>
  </div>;

  const latestAudit = program.audits[0];
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-brand-700">GRO/PGR</p><h1 className="text-3xl font-bold">{program.title}</h1><p className="mt-1 text-slate-500">{project.company.tradeName ?? project.company.legalName} · revisão prevista {program.nextReviewAt?.toLocaleDateString('pt-BR') ?? 'não definida'}</p></div><div className="flex flex-wrap gap-2"><Link href={`/work-projects/${project.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Ver Trabalho SST</Link><form action={`/api/pgr/${project.id}/audit`} method="post"><Button type="submit">Executar auditoria</Button></form></div></div>

    <div className="mt-6 grid gap-4 md:grid-cols-4"><Card><p className="text-xs text-slate-500">Inventário</p><p className="mt-1 text-2xl font-bold">{program.riskAssessments.length}</p><p className="text-xs text-slate-500">riscos avaliados</p></Card><Card><p className="text-xs text-slate-500">Participação</p><p className="mt-1 text-2xl font-bold">{program.participationRecords.length}</p><p className="text-xs text-slate-500">registros coletivos</p></Card><Card><p className="text-xs text-slate-500">Psicossocial</p><p className="mt-1 text-2xl font-bold">{program.psychosocialAssessments.filter((item) => item.status === 'APPROVED').length}</p><p className="text-xs text-slate-500">avaliações aprovadas</p></Card><Card><p className="text-xs text-slate-500">Auditoria</p><p className="mt-1 text-2xl font-bold">{latestAudit?.score ?? '—'}</p>{latestAudit ? <Badge tone={auditTone(latestAudit.status)}>{latestAudit.status}</Badge> : <p className="text-xs text-slate-500">ainda não executada</p>}</Card></div>

    <Card className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Inventário de riscos ocupacionais</h2><p className="text-sm text-slate-500">Dados estruturados, origem rastreável e avaliação determinística.</p></div><form action={`/api/pgr/${project.id}/action-plan`} method="post"><Button type="submit" variant="secondary">Gerar ações necessárias</Button></form></div>
      <form action={`/api/pgr/${project.id}/risks`} method="post" className="mt-5 grid gap-3 lg:grid-cols-4">
        <label className="text-sm">Código<Input className="mt-1" name="code" required maxLength={40} placeholder="PGR-001" /></label>
        <label className="text-sm">Categoria<select name="category" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="PHYSICAL">Físico</option><option value="CHEMICAL">Químico</option><option value="BIOLOGICAL">Biológico</option><option value="ERGONOMIC">Ergonômico</option><option value="PSYCHOSOCIAL">Psicossocial</option><option value="ACCIDENT">Acidente</option><option value="OTHER">Outro</option></select></label>
        <label className="text-sm lg:col-span-2">Perigo<Input className="mt-1" name="hazard" required minLength={3} maxLength={300} placeholder="Ex.: exposição a ruído contínuo" /></label>
        <label className="text-sm lg:col-span-2">Fonte ou circunstância<Input className="mt-1" name="source" placeholder="Máquina, processo, organização do trabalho..." /></label>
        <label className="text-sm lg:col-span-2">GHE<select name="gheId" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Sem vínculo específico</option>{ghes.map((ghe) => <option key={ghe.id} value={ghe.id}>{ghe.label}</option>)}</select></label>
        <label className="text-sm lg:col-span-2">Circunstâncias<Textarea className="mt-1" name="circumstances" rows={3} /></label>
        <label className="text-sm">Possíveis lesões/agravos<Textarea className="mt-1" name="possibleHarms" required rows={3} placeholder="Um por linha" /></label>
        <label className="text-sm">Grupos expostos<Textarea className="mt-1" name="exposedGroups" required rows={3} placeholder="Um por linha" /></label>
        <label className="text-sm lg:col-span-2">Controles existentes<Textarea className="mt-1" name="existingControls" rows={3} placeholder="Um por linha" /></label>
        <label className="text-sm">Expostos<Input className="mt-1" name="exposedCount" type="number" min={0} defaultValue={0} /></label><label className="text-sm">Frequência<Input className="mt-1" name="frequency" placeholder="Diária, eventual..." /></label><label className="text-sm">Duração<Input className="mt-1" name="duration" placeholder="6 h/dia..." /></label><span />
        <label className="text-sm">Severidade (1–5)<Input className="mt-1" name="severity" type="number" min={1} max={5} defaultValue={1} required /></label><label className="text-sm">Probabilidade (1–5)<Input className="mt-1" name="probability" type="number" min={1} max={5} defaultValue={1} required /></label><label className="text-sm">Exposição (1–5)<Input className="mt-1" name="exposure" type="number" min={1} max={5} defaultValue={1} required /></label><div className="flex items-end"><Button className="w-full" type="submit">Salvar risco</Button></div>
      </form>
      <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-3">Código</th><th className="pr-3">Perigo</th><th className="pr-3">GHE</th><th className="pr-3">Inicial</th><th>Residual</th></tr></thead><tbody>{program.riskAssessments.map((risk) => <tr key={risk.id} className="border-b align-top"><td className="py-3 pr-3 font-medium">{risk.code}</td><td className="pr-3"><p>{risk.hazard}</p><p className="text-xs text-slate-500">{jsonList(risk.possibleHarms).join('; ')}</p></td><td className="pr-3">{risk.ghe ? `${risk.ghe.sector.name} · ${risk.ghe.name}` : '—'}</td><td className="pr-3"><Badge tone={riskTone(risk.initialLevel)}>{risk.initialLevel} · {risk.initialScore}</Badge></td><td>{risk.residualLevel ? <Badge tone={riskTone(risk.residualLevel)}>{risk.residualLevel} · {risk.residualScore}</Badge> : <span className="text-slate-400">pendente</span>}</td></tr>)}{!program.riskAssessments.length && <tr><td colSpan={5} className="py-4 text-slate-500">Nenhum risco cadastrado.</td></tr>}</tbody></table></div>
    </Card>

    <div className="mt-6 grid gap-6 xl:grid-cols-2"><Card><h2 className="font-bold">Participação dos trabalhadores</h2><p className="mt-1 text-sm text-slate-500">Registre entrevistas, oficinas, CIPA, consultas e devolutivas coletivas.</p><form action={`/api/pgr/${project.id}/participation`} method="post" className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-sm">Forma<select name="kind" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="INTERVIEW">Entrevista</option><option value="WORKSHOP">Oficina</option><option value="CIPA">CIPA</option><option value="CONSULTATION">Consulta</option><option value="CAMPAIGN">Campanha</option><option value="FOCUS_GROUP">Grupo focal</option><option value="OBSERVATION">Observação</option></select></label><label className="text-sm">Participantes<Input className="mt-1" name="participantCount" type="number" min={0} defaultValue={0} /></label><label className="text-sm md:col-span-2">Título<Input className="mt-1" name="title" required minLength={3} placeholder="Escuta coletiva do setor Produção" /></label><label className="text-sm">Grupos<Textarea className="mt-1" name="groups" rows={3} placeholder="Um por linha" /></label><label className="text-sm">Resultados/encaminhamentos<Textarea className="mt-1" name="outcomes" rows={3} placeholder="Um por linha" /></label><label className="text-sm md:col-span-2">Síntese<Textarea className="mt-1" name="summary" rows={3} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confidential" /> Conteúdo confidencial</label><div className="flex justify-end"><Button type="submit">Registrar</Button></div></form><div className="mt-4 divide-y">{program.participationRecords.map((record) => <div key={record.id} className="py-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-medium">{record.title}</p><p className="text-xs text-slate-500">{record.kind} · {record.participantCount} participantes · {record.occurredAt.toLocaleDateString('pt-BR')}</p></div>{record.confidential && <Badge tone="warning">restrito</Badge>}</div></div>)}{!program.participationRecords.length && <p className="py-3 text-sm text-slate-500">Nenhum registro de participação.</p>}</div></Card>

      <Card><h2 className="font-bold">Fatores psicossociais relacionados ao trabalho</h2><p className="mt-1 text-sm text-slate-500">Consolidação apenas coletiva, com ocultação automática de grupos pequenos e sem diagnóstico individual.</p>{env.FEATURE_PSYCHOSOCIAL_GRO ? <><form action={`/api/pgr/${project.id}/psychosocial`} method="post" className="mt-4 flex flex-col gap-3 sm:flex-row"><select name="campaignId" required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecione uma campanha</option>{project.company.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status}</option>)}</select><Button type="submit">Consolidar</Button></form><div className="mt-4 divide-y">{program.psychosocialAssessments.map((assessment) => <div key={assessment.id} className="py-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-medium">{assessment.campaign?.name ?? assessment.scope ?? 'Avaliação psicossocial'}</p><p className="text-xs text-slate-500">{assessment.validResponses} respostas válidas · {assessment.findings.length} achados divulgáveis</p><p className="mt-1 text-xs text-slate-600">{assessment.summary}</p></div><Badge tone={assessment.status === 'APPROVED' ? 'success' : 'warning'}>{assessment.status}</Badge></div>{assessment.status === 'REVIEW' && <form className="mt-2" action={`/api/pgr/${project.id}/psychosocial/${assessment.id}/approve`} method="post"><Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">Aprovar consolidação</Button></form>}</div>)}{!program.psychosocialAssessments.length && <p className="py-3 text-sm text-slate-500">Nenhuma consolidação realizada.</p>}</div></> : <p className="mt-4 text-sm text-slate-500">Ative FEATURE_PSYCHOSOCIAL_GRO no staging para usar este bloco.</p>}</Card></div>

    <Card className="mt-6"><h2 className="font-bold">Auditorias de completude</h2><div className="mt-3 divide-y">{program.audits.map((run) => { const findings = Array.isArray(run.findings) ? run.findings : []; return <div key={run.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Auditoria de {run.createdAt.toLocaleString('pt-BR')}</p><p className="text-xs text-slate-500">{findings.length} apontamento(s)</p></div><div className="flex items-center gap-2"><span className="font-bold">{run.score}/100</span><Badge tone={auditTone(run.status)}>{run.status}</Badge></div></div><div className="mt-2 grid gap-1">{findings.slice(0, 8).map((finding, index) => { const item = finding as { severity?: string; message?: string }; return <p key={index} className="text-xs text-slate-600">{item.severity === 'ERROR' ? '✗' : item.severity === 'WARNING' ? '⚠' : '•'} {item.message}</p>; })}</div></div>; })}{!program.audits.length && <p className="py-3 text-sm text-slate-500">Execute a primeira auditoria para identificar pendências técnicas.</p>}</div></Card>
  </div>;
}
