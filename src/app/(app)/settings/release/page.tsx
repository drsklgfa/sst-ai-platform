import { requireTenantPermission } from '@/lib/auth';
import { getReleaseReadiness } from '@/lib/release-readiness';
import { Badge, Card } from '@/components/ui';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'PASS' ? 'success' : status === 'WARNING' ? 'warning' : 'danger';

export default async function ReleaseReadinessPage() {
  const { tenant } = await requireTenantPermission('system.read');
  const readiness = await getReleaseReadiness(tenant.id);
  return <div className="max-w-7xl"><p className="text-sm text-brand-700">Homologação</p><h1 className="text-3xl font-bold">Prontidão para lançamento</h1><p className="text-slate-500">Portões técnicos e operacionais antes de liberar clientes pagantes.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Card><p className="text-sm text-slate-500">Estado</p><p className="mt-1 text-xl font-bold">{readiness.status}</p></Card><Card><p className="text-sm text-slate-500">Pontuação</p><p className="mt-1 text-3xl font-bold">{readiness.score}%</p></Card><Card><p className="text-sm text-slate-500">Bloqueios / alertas</p><p className="mt-1 text-2xl font-bold">{readiness.blocked} / {readiness.warnings}</p></Card></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">{readiness.checks.map((check) => <Card key={check.code}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{check.category}</p><h2 className="font-bold">{check.title}</h2><p className="mt-1 text-sm text-slate-600">{check.detail}</p></div><Badge tone={tone(check.status)}>{check.status}</Badge></div></Card>)}</div>
  </div>;
}
