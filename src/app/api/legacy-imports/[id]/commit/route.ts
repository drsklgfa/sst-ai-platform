import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { commitLegacyImportBatch } from '@/lib/legacy-imports';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_LEGACY_IMPORTS) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user } = authorization;
  const { id } = await params;
  try {
    const result = await commitLegacyImportBatch({ batchId: id, tenantId: tenant.id, userId: user.id });
    return NextResponse.redirect(publicAppUrl(result.projects[0] ? `/work-projects/${result.projects[0].id}` : `/companies/${result.company.id}`), 303);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Falha ao aplicar importação', { status: 400 });
  }
}
