import type { CompanyUserRole, MembershipRole } from '@prisma/client';

export type Permission =
  | 'company.read'
  | 'company.write'
  | 'work.manage'
  | 'access.manage'
  | 'campaign.manage'
  | 'response.moderate'
  | 'inspection.manage'
  | 'document.edit'
  | 'document.issue'
  | 'document.sign'
  | 'action.manage'
  | 'message.manage'
  | 'backup.manage'
  | 'settings.manage'
  | 'audit.read'
  | 'security.manage'
  | 'system.read'
  | 'medical.program.read'
  | 'medical.program.manage'
  | 'medical.worker.read'
  | 'medical.worker.manage'
  | 'medical.clinical.read'
  | 'medical.clinical.write'
  | 'medical.aso.issue'
  | 'medical.analytics.read'
  | 'esocial.prepare'
  | 'exposure.read'
  | 'exposure.manage'
  | 'technical.conclusion.approve'
  | 'ppp.prepare'
  | 'esocial.s2240.prepare'
  | 'ergonomics.read'
  | 'ergonomics.manage'
  | 'ergonomics.conclusion.approve'
  | 'hygiene.read'
  | 'hygiene.manage'
  | 'hygiene.review'
  | 'instrument.read'
  | 'instrument.manage'
  | 'training.read'
  | 'training.manage'
  | 'training.instruct'
  | 'training.evaluate'
  | 'training.certificate.issue'
  | 'competency.manage'
  | 'operations.read'
  | 'operations.manage'
  | 'incident.manage'
  | 'incident.investigation.approve'
  | 'permit.issue'
  | 'permit.approve'
  | 'machine.manage'
  | 'chemical.manage'
  | 'emergency.manage'
  | 'cipa.manage'
  | 'contractor.manage'
  | 'compliance.manage'
  | 'esocial.transmit'
  | 'billing.read'
  | 'billing.manage'
  | 'portal.request.manage';

export type CompanyPermission =
  | 'portal.dashboard'
  | 'document.read'
  | 'action.read'
  | 'action.update'
  | 'action.evidence'
  | 'message.read'
  | 'message.create'
  | 'message.reply'
  | 'evidence.read'
  | 'access.manage'
  | 'training.read'
  | 'training.take'
  | 'portal.request.read'
  | 'portal.request.create';

const allTenantPermissions: Permission[] = [
  'company.read',
  'company.write',
  'work.manage',
  'access.manage',
  'campaign.manage',
  'response.moderate',
  'inspection.manage',
  'document.edit',
  'document.issue',
  'document.sign',
  'action.manage',
  'message.manage',
  'backup.manage',
  'settings.manage',
  'audit.read',
  'security.manage',
  'system.read',
  'medical.program.read',
  'medical.program.manage',
  'medical.worker.read',
  'medical.worker.manage',
  'medical.analytics.read',
  'esocial.prepare',
  'exposure.read',
  'exposure.manage',
  'technical.conclusion.approve',
  'ppp.prepare',
  'esocial.s2240.prepare',
  'ergonomics.read',
  'ergonomics.manage',
  'ergonomics.conclusion.approve',
  'hygiene.read',
  'hygiene.manage',
  'hygiene.review',
  'instrument.read',
  'instrument.manage',
  'training.read',
  'training.manage',
  'training.instruct',
  'training.evaluate',
  'training.certificate.issue',
  'competency.manage',
  'operations.read',
  'operations.manage',
  'incident.manage',
  'incident.investigation.approve',
  'permit.issue',
  'permit.approve',
  'machine.manage',
  'chemical.manage',
  'emergency.manage',
  'cipa.manage',
  'contractor.manage',
  'compliance.manage',
  'esocial.transmit',
  'billing.read',
  'billing.manage',
  'portal.request.manage',
];

const tenantRolePermissions: Record<MembershipRole, Permission[]> = {
  OWNER: allTenantPermissions,
  ADMIN: allTenantPermissions,
  RESPONSIBLE_TECH: allTenantPermissions.filter((permission) => !['settings.manage', 'security.manage'].includes(permission)),
  OCCUPATIONAL_PHYSICIAN: Array.from(new Set<Permission>([...allTenantPermissions.filter((permission) => !(['settings.manage', 'security.manage', 'backup.manage'] as Permission[]).includes(permission)), 'medical.clinical.read', 'medical.clinical.write', 'medical.aso.issue'])),
  MEDICAL_ASSISTANT: ['company.read', 'work.manage', 'document.edit', 'message.manage', 'medical.program.read', 'medical.program.manage', 'medical.worker.read', 'medical.worker.manage', 'medical.clinical.read', 'medical.clinical.write', 'medical.analytics.read', 'esocial.prepare'],
  CONSULTANT: [
    'company.read',
    'company.write',
    'work.manage',
    'access.manage',
    'campaign.manage',
    'response.moderate',
    'inspection.manage',
    'document.edit',
    'document.issue',
    'action.manage',
    'message.manage',
    'medical.program.read',
    'medical.program.manage',
    'medical.worker.read',
    'medical.worker.manage',
    'medical.analytics.read',
    'esocial.prepare',
    'exposure.read',
    'exposure.manage',
    'ppp.prepare',
    'esocial.s2240.prepare',
    'ergonomics.read',
    'ergonomics.manage',
    'hygiene.read',
    'hygiene.manage',
    'instrument.read',
    'instrument.manage',
    'training.read',
    'training.manage',
    'training.instruct',
    'training.evaluate',
    'competency.manage',
    'operations.read',
    'operations.manage',
    'incident.manage',
    'permit.issue',
    'machine.manage',
    'chemical.manage',
    'emergency.manage',
    'cipa.manage',
    'contractor.manage',
    'compliance.manage',
    'portal.request.manage',
  ],
  ASSISTANT: [
    'company.read',
    'company.write',
    'work.manage',
    'campaign.manage',
    'inspection.manage',
    'document.edit',
    'action.manage',
    'message.manage',
    'ergonomics.read',
    'ergonomics.manage',
    'hygiene.read',
    'hygiene.manage',
    'instrument.read',
    'training.read',
    'training.manage',
    'operations.read',
    'operations.manage',
    'incident.manage',
    'permit.issue',
    'machine.manage',
    'chemical.manage',
    'contractor.manage',
  ],
  REVIEWER: ['company.read', 'work.manage', 'response.moderate', 'document.edit', 'document.issue', 'message.manage', 'audit.read', 'medical.program.read', 'medical.worker.read', 'medical.analytics.read', 'exposure.read', 'ergonomics.read', 'hygiene.read', 'instrument.read', 'training.read', 'training.evaluate', 'operations.read', 'incident.investigation.approve', 'permit.approve'],
  COMMERCIAL: ['company.read', 'company.write', 'access.manage', 'message.manage', 'billing.read', 'portal.request.manage'],
  FINANCE: ['company.read', 'message.manage', 'system.read', 'billing.read', 'billing.manage'],
  READER: ['company.read'],
};

const allCompanyPermissions: CompanyPermission[] = [
  'portal.dashboard',
  'document.read',
  'action.read',
  'action.update',
  'action.evidence',
  'message.read',
  'message.create',
  'message.reply',
  'evidence.read',
  'access.manage',
  'training.read',
  'training.take',
  'portal.request.read',
  'portal.request.create',
];

export const companyRolePermissions: Record<CompanyUserRole, CompanyPermission[]> = {
  RH_ADMIN: allCompanyPermissions,
  SST: [
    'portal.dashboard',
    'document.read',
    'action.read',
    'action.update',
    'action.evidence',
    'message.read',
    'message.create',
    'message.reply',
    'evidence.read',
    'training.read',
    'training.take',
    'portal.request.read',
    'portal.request.create',
  ],
  MANAGER: [
    'portal.dashboard',
    'action.read',
    'action.update',
    'action.evidence',
    'message.read',
    'message.create',
    'message.reply',
    'evidence.read',
    'training.read',
    'training.take',
    'portal.request.read',
    'portal.request.create',
  ],
  ACTION_OWNER: ['action.read', 'action.update', 'action.evidence', 'message.read', 'message.create', 'message.reply', 'evidence.read', 'training.read', 'training.take', 'portal.request.read', 'portal.request.create'],
  DIRECTOR: ['portal.dashboard', 'document.read', 'action.read', 'message.read', 'training.read', 'portal.request.read', 'portal.request.create'],
  READER: ['document.read', 'training.read', 'portal.request.read'],
  AUDITOR: ['portal.dashboard', 'document.read', 'action.read', 'evidence.read', 'training.read', 'portal.request.read'],
};

function includesOverride(overrides: unknown, permission: string): boolean {
  return Array.isArray(overrides) && overrides.some((value) => value === permission);
}

export function hasTenantPermission(role: MembershipRole, permission: Permission, overrides: unknown = []): boolean {
  return tenantRolePermissions[role].includes(permission) || includesOverride(overrides, permission);
}

export function hasCompanyPermission(role: CompanyUserRole, permission: CompanyPermission, overrides: unknown = []): boolean {
  return companyRolePermissions[role].includes(permission) || includesOverride(overrides, permission);
}

export function tenantPermissionsFor(role: MembershipRole, overrides: unknown = []): Permission[] {
  return [...new Set([...tenantRolePermissions[role], ...(Array.isArray(overrides) ? overrides.filter((item): item is Permission => typeof item === 'string' && allTenantPermissions.includes(item as Permission)) : [])])];
}

export function companyPermissionsFor(role: CompanyUserRole, overrides: unknown = []): CompanyPermission[] {
  return [...new Set([...companyRolePermissions[role], ...(Array.isArray(overrides) ? overrides.filter((item): item is CompanyPermission => typeof item === 'string' && allCompanyPermissions.includes(item as CompanyPermission)) : [])])];
}
