import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'danger' : ['REVIEW', 'READY'].includes(status) ? 'warning' : 'neutral';

export default async function LegacyImportsPage() {
  if (!env.FEATURE_LEGACY_IMPORTS) notFound();
  const { tenant } = await requireTenantPermission('work.manage');
  const batches = await db.legacyImportBatch.findMany({
    where: { tenantId: tenant.id, status: { not: 'CANCELLED' } },
    include: {
      company: { select: { legalName: true, tradeName: true } },
      _count: { select: { documents: true, facts: true, conflicts: true } },
      conflicts: { where: { status: 'OPEN' }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold text-brand-700">Migração assistida</p><h1 className="text-3xl font-bold">Importar acervo antigo</h1><p className="text-slate-500">Transforme PGR, PCMSO, LTCAT, LI, LP, AET e planilhas antigas em dados revisáveis da plataforma.</p></div>
      <Link href="/legacy-imports/new" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Nova importação</Link>
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {batches.map((batch) => <Link href={`/legacy-imports/${batch.id}`} key={batch.id}>
        <Card className="h-full transition hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{batch.title}</h2><p className="text-sm text-slate-500">{batch.company ? batch.company.tradeName ?? batch.company.legalName : 'Empresa será identificada'}</p></div><Badge tone={tone(batch.status)}>{batch.status}</Badge></div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span>{batch._count.documents} arquivos</span><span>{batch._count.facts} dados</span>{batch.conflicts.length > 0 && <span className="font-semibold text-amber-700">{batch.conflicts.length} conflitos</span>}</div>
          <p className="mt-3 text-xs text-slate-400">Atualizado em {batch.updatedAt.toLocaleString('pt-BR')}</p>
        </Card>
      </Link>)}
      {!batches.length && <Card><p className="font-medium">Nenhuma importação criada.</p><p className="mt-1 text-sm text-slate-500">Envie documentos antigos para cadastrar a empresa e preparar os novos trabalhos.</p></Card>}
    </div>
  </div>;
}
