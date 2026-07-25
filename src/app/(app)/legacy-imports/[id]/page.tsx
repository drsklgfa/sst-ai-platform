import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { legacyKindLabel } from '@/domain/legacy-import/catalog';

const tone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => ['APPROVED','APPLIED','COMPLETED','RESOLVED'].includes(status) ? 'success' : ['FAILED','REJECTED'].includes(status) ? 'danger' : ['NEEDS_REVIEW','REVIEW','OPEN','READY'].includes(status) ? 'warning' : 'neutral';
const formatValue = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

export default async function LegacyImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) notFound();
  const { id } = await params;
  const { tenant } = await requireTenantPermission('work.manage');
  const batch = await db.legacyImportBatch.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      company: { select: { id: true, legalName: true, tradeName: true } },
      documents: { include: { file: true }, orderBy: { createdAt: 'asc' } },
      facts: { include: { document: { include: { file: { select: { originalName: true } } } } }, orderBy: [{ domain: 'asc' }, { entityType: 'asc' }, { entityKey: 'asc' }, { fieldPath: 'asc' }], take: 500 },
      conflicts: { where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!batch) notFound();
  const factMap = new Map(batch.facts.map((fact) => [fact.id, fact]));
  const approved = batch.facts.filter((fact) => ['APPROVED','APPLIED'].includes(fact.status)).length;
  const pending = batch.facts.filter((fact) => ['EXTRACTED','NEEDS_REVIEW'].includes(fact.status)).length;
  const rejected = batch.facts.filter((fact) => fact.status === 'REJECTED').length;
  const analysisPending = batch.documents.some((document) => ['UPLOADED','QUEUED','ANALYZING'].includes(document.status));
  const canCommit = !analysisPending && batch.conflicts.length === 0 && approved > 0 && batch.status !== 'COMPLETED';

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-brand-700">Importação de acervo</p><h1 className="text-3xl font-bold">{batch.title}</h1><p className="text-slate-500">{batch.company ? <Link href={`/companies/${batch.company.id}`} className="hover:underline">{batch.company.tradeName ?? batch.company.legalName}</Link> : 'Empresa ainda não vinculada'} · {batch.documents.length} arquivos</p></div><Badge tone={tone(batch.status)}>{batch.status}</Badge></div>
    {batch.error && <Card className="mt-5 border-red-200 bg-red-50"><p className="font-semibold text-red-800">Falha registrada</p><p className="mt-1 text-sm text-red-700">{batch.error}</p></Card>}

    <div className="mt-6 grid gap-4 md:grid-cols-4"><Card><p className="text-xs text-slate-500">Extraídos</p><p className="mt-1 text-2xl font-bold">{batch.facts.length}</p></Card><Card><p className="text-xs text-slate-500">Aprovados</p><p className="mt-1 text-2xl font-bold text-emerald-700">{approved}</p></Card><Card><p className="text-xs text-slate-500">Pendentes</p><p className="mt-1 text-2xl font-bold text-amber-700">{pending}</p></Card><Card><p className="text-xs text-slate-500">Conflitos</p><p className="mt-1 text-2xl font-bold text-red-700">{batch.conflicts.length}</p></Card></div>

    <Card className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Documentos originais</h2><p className="text-sm text-slate-500">Os arquivos permanecem preservados; a extração é uma camada separada e auditável.</p></div>{!analysisPending && batch.status !== 'COMPLETED' && <form action={`/api/legacy-imports/${batch.id}/approve-high-confidence`} method="post"><Button type="submit" variant="secondary">Aprovar dados ≥ 85%</Button></form>}</div>
      <div className="mt-4 divide-y">{batch.documents.map((document) => <div key={document.id} className="flex flex-wrap items-start justify-between gap-4 py-4"><div><p className="font-medium">{document.file.originalName}</p><p className="text-xs text-slate-500">{legacyKindLabel(document.detectedKind)}{document.referenceYear ? ` · ${document.referenceYear}` : ''}{document.provider ? ` · ${document.provider}/${document.model}` : ''}</p>{document.summary && <p className="mt-2 max-w-4xl text-sm text-slate-600">{document.summary}</p>}{document.error && <p className="mt-2 text-sm text-red-700">{document.error}</p>}</div><div className="flex items-center gap-2"><Badge tone={tone(document.status)}>{document.status}</Badge>{document.status === 'FAILED' && <form action={`/api/legacy-imports/${batch.id}/documents/${document.id}/retry`} method="post"><Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">Tentar novamente</Button></form>}</div></div>)}</div>
    </Card>

    <section id="conflicts" className="mt-6"><Card><h2 className="text-lg font-bold">Conflitos entre documentos</h2><p className="text-sm text-slate-500">Escolha qual origem prevalece. A alternativa não escolhida será rejeitada, sem alterar o arquivo original.</p>
      <div className="mt-4 grid gap-4">{batch.conflicts.map((conflict) => {
        const ids = Array.isArray(conflict.factIds) ? conflict.factIds.filter((value): value is string => typeof value === 'string') : [];
        const options = ids.map((factId) => factMap.get(factId)).filter(Boolean);
        return <div key={conflict.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">{conflict.summary}</p><form action={`/api/legacy-imports/${batch.id}/conflicts/${conflict.id}`} method="post" className="mt-3 grid gap-2">{options.map((fact: any) => <label key={fact.id} className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm"><input type="radio" name="selectedFactId" value={fact.id} required /><span><strong>{formatValue(fact.normalizedValue ?? fact.value)}</strong><br /><span className="text-xs text-slate-500">{fact.document?.file.originalName}{fact.sourcePage ? ` · página ${fact.sourcePage}` : ''} · confiança {fact.confidence}%</span></span></label>)}<div className="mt-2 flex gap-2"><Button type="submit">Usar seleção</Button><button type="submit" name="ignore" value="1" formNoValidate className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Manter como ressalva</button></div></form></div>;
      })}{!batch.conflicts.length && <p className="text-sm text-emerald-700">Nenhum conflito aberto.</p>}</div>
    </Card></section>

    <Card className="mt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Dados extraídos para revisão</h2><p className="text-sm text-slate-500">Página, trecho e confiança permanecem associados a cada campo. Dados médicos sensíveis exigem revisão individual.</p></div><p className="text-xs text-slate-500">{approved} aprovados · {pending} pendentes · {rejected} rejeitados</p></div>
      <div className="mt-4 divide-y">{batch.facts.map((fact) => <div id={`fact-${fact.id}`} key={fact.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_1.4fr_auto]"><div><p className="text-xs font-semibold text-brand-700">{fact.domain} · {fact.entityType}{fact.entityKey ? ` · ${fact.entityKey}` : ''}</p><p className="font-medium">{fact.label}</p><p className="text-xs text-slate-500">{fact.fieldPath} · confiança {fact.confidence}%</p></div><div><pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm">{formatValue(fact.normalizedValue ?? fact.value)}</pre>{fact.sourceExcerpt && <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-xs text-slate-500">{fact.sourceExcerpt}</blockquote>}<p className="mt-1 text-xs text-slate-400">{fact.document?.file.originalName ?? 'Origem não informada'}{fact.sourcePage ? ` · página ${fact.sourcePage}` : ''}{fact.sourceLocator ? ` · ${fact.sourceLocator}` : ''}</p></div><div className="flex items-start gap-2"><Badge tone={tone(fact.status)}>{fact.status}</Badge>{!['APPLIED'].includes(fact.status) && <div className="grid gap-2"><form action={`/api/legacy-imports/${batch.id}/facts/${fact.id}`} method="post"><input type="hidden" name="status" value="APPROVED" /><Button type="submit" variant="outline" className="w-full px-3 py-1.5 text-xs">Aprovar</Button></form><form action={`/api/legacy-imports/${batch.id}/facts/${fact.id}`} method="post"><input type="hidden" name="status" value="REJECTED" /><Button type="submit" variant="ghost" className="w-full px-3 py-1.5 text-xs">Rejeitar</Button></form></div>}</div></div>)}{!batch.facts.length && <p className="py-4 text-sm text-slate-500">Aguardando análise dos documentos.</p>}</div>
    </Card>

    <Card className="mt-6 border-brand-200 bg-brand-50"><h2 className="text-lg font-bold">Aplicar na plataforma</h2><p className="mt-1 text-sm text-slate-600">A ação cadastra somente dados aprovados, preserva campos já existentes e cria os trabalhos selecionados com os documentos antigos como fontes.</p><div className="mt-4">{canCommit ? <form action={`/api/legacy-imports/${batch.id}/commit`} method="post"><Button type="submit">Cadastrar e criar novos trabalhos</Button></form> : <p className="text-sm font-medium text-amber-800">Finalize as análises, resolva os conflitos e aprove ao menos um dado.</p>}</div></Card>
  </div>;
}
