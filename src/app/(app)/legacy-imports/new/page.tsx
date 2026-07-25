import { notFound } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { LEGACY_TARGET_SERVICES } from '@/domain/legacy-import/catalog';

const labels: Record<string, string> = {
  PGR: 'PGR/GRO', PCMSO: 'PCMSO', LTCAT: 'LTCAT', INSALUBRIDADE: 'Insalubridade', PERICULOSIDADE: 'Periculosidade',
  AET: 'AEP/AET', HIGIENE_OCUPACIONAL: 'Avaliações ambientais', TREINAMENTOS: 'Treinamentos',
};

export default async function NewLegacyImportPage() {
  if (!env.FEATURE_LEGACY_IMPORTS) notFound();
  const { tenant } = await requireTenantPermission('work.manage');
  const companies = await db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, orderBy: { legalName: 'asc' }, select: { id: true, legalName: true, tradeName: true } });
  return <div className="max-w-4xl"><h1 className="text-3xl font-bold">Nova importação de acervo</h1><p className="text-slate-500">Envie até 20 documentos. Os originais serão preservados e nada será cadastrado sem revisão.</p>
    <Card className="mt-6"><form action="/api/legacy-imports" method="post" encType="multipart/form-data" className="grid gap-6">
      <label className="grid gap-2 text-sm font-medium">Nome da importação<Input name="title" minLength={3} maxLength={200} required placeholder="Ex.: Renovação 2027 — Empresa X" /></label>
      <label className="grid gap-2 text-sm font-medium">Empresa já cadastrada (opcional)<select name="companyId" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Identificar ou cadastrar pelos documentos</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName ?? company.legalName}</option>)}</select></label>
      <fieldset><legend className="text-sm font-semibold">Novos trabalhos que deseja preparar</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{LEGACY_TARGET_SERVICES.map((service) => <label key={service} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" name="targetServices" value={service} defaultChecked={['PGR','PCMSO','LTCAT'].includes(service)} />{labels[service] ?? service}</label>)}</div></fieldset>
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm"><input type="checkbox" name="autoCreateCompany" defaultChecked className="mt-1" /><span><strong>Permitir cadastro da empresa após revisão.</strong><br /><span className="text-slate-500">A razão social precisa estar aprovada. Empresas existentes nunca terão campos preenchidos sobrescritos automaticamente.</span></span></label>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><input type="checkbox" name="documentsAnonymized" className="mt-1" /><span><strong>Os documentos estão anonimizados.</strong><br /><span className="text-slate-600">Marque quando estiver usando a política protegida. No perfil profissional, o sistema registra o envio ao provedor e mantém a revisão humana.</span></span></label>
      <label className="grid gap-2 text-sm font-medium">Documentos<input type="file" name="files" multiple required accept=".pdf,.docx,.xlsx,.xls,.txt,.csv,.json,.xml,.jpg,.jpeg,.png,.webp" className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8" /><span className="text-xs font-normal text-slate-500">PDF, DOCX, XLSX, imagens e arquivos de texto; até 50 MB por arquivo.</span></label>
      <div><Button type="submit">Enviar e iniciar análise</Button></div>
    </form></Card>
  </div>;
}
