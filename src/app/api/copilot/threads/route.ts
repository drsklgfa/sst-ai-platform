import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { createCopilotThread } from '@/lib/ai-orchestrator';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request) {
  if (!env.FEATURE_AI_COPILOT) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user, membership } = authorization;
  const form = await request.formData();
  try {
    const thread = await createCopilotThread({
      tenantId: tenant.id,
      userId: user.id,
      role: membership.role,
      permissionOverrides: membership.permissions,
      title: String(form.get('title') ?? '').trim(),
      companyId: String(form.get('companyId') ?? '').trim() || null,
      workProjectId: String(form.get('workProjectId') ?? '').trim() || null,
      preferredProvider: ['OPENAI', 'GEMINI'].includes(String(form.get('provider'))) ? String(form.get('provider')) as 'OPENAI' | 'GEMINI' : undefined,
    });
    return NextResponse.redirect(publicAppUrl(`/copilot/${thread.id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`/copilot?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
