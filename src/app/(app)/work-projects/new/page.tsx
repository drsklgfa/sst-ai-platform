import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { supportedServiceTypes, defaultWorkflowDefinitions } from '@/domain/workflows/templates';
import { Button, Card, Input } from '@/components/ui';

export default async function NewWorkProjectPage() {
  if (!env.FEATURE_V10_WORKS) notFound();
  const { tenant } = await requireTenantPermission('work.manage');
  const companies = await db.company.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' }, orderBy: { legalName: 'asc' } });
  return <div className="max-w-3xl"><h1 className="text-3xl font-bold">Novo trabalho SST</h1><p className="text-slate-500">O sistema criará automaticamente as etapas e pendências do serviço escolhido.</p>
    <Card className="mt-6"><form action="/api/work-projects" method="post" className="grid gap-5">
      <label className="grid gap-2 text-sm font-medium">Empresa<select name="companyId" required className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName ?? company.legalName}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Tipo de serviço<select name="serviceType" required className="rounded-xl border border-slate-300 bg-white px-3 py-2.5">{supportedServiceTypes.map((type) => <option key={type} value={type}>{defaultWorkflowDefinitions[type].name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Título opcional<Input name="title" maxLength={200} placeholder="Será preenchido automaticamente se ficar vazio" /></label>
      <label className="grid gap-2 text-sm font-medium">Prazo<Input name="dueAt" type="date" /></label>
      <div><Button type="submit">Criar trabalho</Button></div>
    </form></Card>
  </div>;
}
