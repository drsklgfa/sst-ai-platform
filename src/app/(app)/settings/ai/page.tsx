import { notFound } from 'next/navigation';
import { requireTenantPermission } from '@/lib/auth';
import { env } from '@/lib/env';
import { loadTenantAIConfigurations } from '@/lib/ai-config';
import { Card, Button, Input, Badge } from '@/components/ui';
import { normalizeProviderSettings } from '@/domain/ai/capabilities';

const providerLabel = { OPENAI: 'OpenAI', GEMINI: 'Google Gemini' } as const;

export default async function AISettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!env.FEATURE_AI_SETTINGS) notFound();
  const { tenant } = await requireTenantPermission('settings.manage');
  const query = await searchParams;
  const loaded = await loadTenantAIConfigurations(tenant.id);
  const configurations = (['OPENAI', 'GEMINI'] as const).map((provider) => loaded.find((item) => item.provider === provider) ?? ({
    id: '', provider, enabled: false, hasSecret: false, settings: normalizeProviderSettings({}, provider), updatedAt: null,
  }));
  const message = typeof query.saved === 'string' ? 'Configuração salva.' : typeof query.test === 'string' && query.test === 'ok' ? `Conexão com ${String(query.provider ?? '')} validada.` : typeof query.error === 'string' ? decodeURIComponent(query.error).slice(0, 300) : null;

  return <div className="max-w-6xl"><div><p className="text-sm text-brand-700">Configurações</p><h1 className="text-3xl font-bold">Inteligência Artificial</h1><p className="text-slate-500">Provedores, modelos, limites, política de dados e autonomia supervisionada.</p></div>
    {message && <div className={`mt-5 rounded-xl border p-4 text-sm ${query.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message}</div>}
    <Card className="mt-6"><h2 className="font-bold">Regras gerais</h2><div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3"><div><strong>Assistente:</strong> apenas sugere.</div><div><strong>Copiloto:</strong> prepara e pede confirmação.</div><div><strong>Autonomia supervisionada:</strong> executa ações seguras e bloqueia as críticas.</div></div><p className="mt-3 text-xs text-slate-500">Emissão final, assinatura, exclusão e conclusão técnica oficial permanecem manuais.</p></Card>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">{configurations.map((configuration) => <Card key={configuration.provider}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{providerLabel[configuration.provider]}</h2><p className="text-sm text-slate-500">Chave {configuration.hasSecret ? 'armazenada de forma criptografada' : 'ainda não cadastrada'}.</p></div><Badge tone={configuration.enabled ? 'success' : 'neutral'}>{configuration.enabled ? 'ATIVO' : 'DESATIVADO'}</Badge></div>
      <form action="/api/settings/ai" method="post" className="mt-5 grid gap-4">
        <input type="hidden" name="provider" value={configuration.provider} />
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="enabled" defaultChecked={configuration.enabled} /> Habilitar provedor</label>
        <label className="grid gap-2 text-sm font-medium">Chave da API<Input name="apiKey" type="password" autoComplete="new-password" placeholder={configuration.hasSecret ? 'Deixe vazio para manter a chave atual' : 'Cole a chave aqui'} /></label>
        <label className="grid gap-2 text-sm font-medium">Modelo econômico<Input name="modelEconomy" required defaultValue={configuration.settings.modelEconomy} placeholder="Modelo configurado no provedor" /></label>
        <label className="grid gap-2 text-sm font-medium">Modelo avançado<Input name="modelAdvanced" defaultValue={configuration.settings.modelAdvanced} placeholder="Pode ser o mesmo modelo" /></label>
        <label className="grid gap-2 text-sm font-medium">Modelo para imagens e documentos<Input name="modelVision" defaultValue={configuration.settings.modelVision} placeholder="Pode ser o mesmo modelo" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Limite diário de solicitações<Input name="dailyRequestLimit" type="number" min="0" max="100000" defaultValue={configuration.settings.dailyRequestLimit} /></label><label className="grid gap-2 text-sm font-medium">Orçamento mensal (centavos)<Input name="monthlyBudgetCents" type="number" min="0" max="100000000" defaultValue={configuration.settings.monthlyBudgetCents} /></label></div>
        <label className="grid gap-2 text-sm font-medium">Política de dados<select name="dataPolicy" defaultValue={configuration.settings.dataPolicy} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="PROTECTED">Protegido — anonimização obrigatória</option><option value="PROFESSIONAL">Profissional — uso controlado de dados reais</option></select></label>
        <label className="grid gap-2 text-sm font-medium">Autonomia<select name="autonomy" defaultValue={configuration.settings.autonomy} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="ASSISTANT">Assistente</option><option value="COPILOT">Copiloto</option><option value="SUPERVISED_AUTONOMY">Autonomia supervisionada</option></select></label>
        <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">Capacidades habilitadas</legend><div className="grid gap-2 text-sm sm:grid-cols-2"><label><input type="checkbox" name="capText" defaultChecked={configuration.settings.capabilities.text} /> Texto</label><label><input type="checkbox" name="capImages" defaultChecked={configuration.settings.capabilities.images} /> Imagens</label><label><input type="checkbox" name="capPdf" defaultChecked={configuration.settings.capabilities.pdf} /> PDFs</label><label><input type="checkbox" name="capTools" defaultChecked={configuration.settings.capabilities.tools} /> Ferramentas</label><label><input type="checkbox" name="capStructured" defaultChecked={configuration.settings.capabilities.structuredOutput} /> Saída estruturada</label><label><input type="checkbox" name="capLongContext" defaultChecked={configuration.settings.capabilities.longContext} /> Contexto extenso</label></div></fieldset>
        <div className="flex flex-wrap gap-2"><Button type="submit" name="operation" value="save">Salvar</Button><Button type="submit" name="operation" value="test" variant="outline">Testar conexão</Button><Button type="submit" name="operation" value="disable" variant="ghost">Desativar</Button></div>
      </form>
    </Card>)}</div>
  </div>;
}
