import Link from 'next/link';
import { requireTenant } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasTenantPermission } from '@/lib/rbac';
import { env } from '@/lib/env';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireTenant();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const canManageWorks = hasTenantPermission(membership.role, 'work.manage', membership.permissions);
  const canReadCompanies = hasTenantPermission(membership.role, 'company.read', membership.permissions);
  const canCampaign = hasTenantPermission(membership.role, 'campaign.manage', membership.permissions);
  const canMessage = hasTenantPermission(membership.role, 'message.manage', membership.permissions);
  const canBackup = hasTenantPermission(membership.role, 'backup.manage', membership.permissions);
  const canSettings = hasTenantPermission(membership.role, 'settings.manage', membership.permissions);
  const canAudit = hasTenantPermission(membership.role, 'audit.read', membership.permissions);
  const canSecurity = hasTenantPermission(membership.role, 'security.manage', membership.permissions);
  const canSystem = hasTenantPermission(membership.role, 'system.read', membership.permissions);
  const canMedicalProgram = hasTenantPermission(membership.role, 'medical.program.read', membership.permissions);
  const canExposure = hasTenantPermission(membership.role, 'exposure.read', membership.permissions);
  const canTraining = hasTenantPermission(membership.role, 'training.read', membership.permissions);
  const canOperations = hasTenantPermission(membership.role, 'operations.read', membership.permissions);
  const canBilling = hasTenantPermission(membership.role, 'billing.read', membership.permissions);

  return (
    <div className="shell">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link href="/dashboard" className="font-bold text-brand-700">Plataforma SST</Link>
          <nav className="flex items-center gap-4 text-sm">
            {canReadCompanies && <Link href="/dashboard">Painel</Link>}
            {canReadCompanies && <Link href="/companies">Empresas</Link>}
            {env.FEATURE_V10_WORKS && canManageWorks && <Link href="/work-projects">Trabalhos</Link>}
            {env.FEATURE_LEGACY_IMPORTS && canManageWorks && <Link href="/legacy-imports">Importar acervo</Link>}
            {env.FEATURE_FIELD_OPERATIONS && canManageWorks && <Link href="/field-visits">Campo</Link>}
            {env.FEATURE_AI_COPILOT && canManageWorks && <Link href="/copilot">Copiloto</Link>}
            {env.FEATURE_PCMSO && canMedicalProgram && <Link href="/work-projects?serviceType=PCMSO">Saúde ocupacional</Link>}
            {env.FEATURE_EXPOSURE_CORE && canExposure && <Link href="/work-projects?serviceType=LTCAT">Exposições e previdenciário</Link>}
            {env.FEATURE_CORPORATE_UNIVERSITY && canTraining && <Link href="/work-projects?serviceType=TREINAMENTO">Treinamentos</Link>}
            {env.FEATURE_OPERATIONAL_SST && canOperations && <Link href="/work-projects?serviceType=OPERACAO_SST">Operação SST</Link>}
            {canCampaign && <Link href="/questionnaires">Questionários</Link>}
            {canMessage && <Link href="/messages">Mensagens</Link>}
            <Link href="/notifications">Notificações{unread ? ` (${unread})` : ''}</Link>
            {canBackup && <Link href="/backups">Backups</Link>}
            {canSettings && <Link href="/settings/users">Equipe</Link>}
            {canSettings && <Link href="/settings/templates">Modelos</Link>}
            {env.FEATURE_AI_SETTINGS && canSettings && <Link href="/settings/ai">IA</Link>}
            {canAudit && <Link href="/settings/audit">Auditoria</Link>}
            {canSecurity && <Link href="/settings/security">Segurança</Link>}
            {env.FEATURE_BILLING && canBilling && <Link href="/settings/billing">Planos e cobrança</Link>}
            {canSystem && <Link href="/settings/system">Sistema</Link>}
            {canSystem && <Link href="/settings/release">Homologação</Link>}
            <span className="rounded-full bg-slate-100 px-3 py-1">{user.name}</span>
            <form action="/api/auth/logout" method="post"><button>Sair</button></form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-7">{children}</main>
    </div>
  );
}
