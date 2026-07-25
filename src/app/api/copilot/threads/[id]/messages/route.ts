import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { sendCopilotMessage } from '@/lib/ai-orchestrator';
import { env } from '@/lib/env';
import { publicAppUrl } from '@/lib/public-url';
import { validateCopilotFiles } from '@/domain/field/validation';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.FEATURE_AI_COPILOT) return new Response('Módulo desativado', { status: 404 });
  const authorization = await authorizeTenantApi('work.manage');
  if (authorization instanceof Response) return authorization;
  const { tenant, user, membership } = authorization;
  const { id } = await params;
  const form = await request.formData();
  const content = String(form.get('content') ?? '').trim();
  const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
  if (!content && !files.length) return new Response('Mensagem vazia', { status: 400 });
  if (files.length && !env.FEATURE_MULTIMODAL_INPUT) return new Response('Entrada multimodal desativada', { status: 404 });
  try {
    validateCopilotFiles(files);
    await sendCopilotMessage({
      tenantId: tenant.id,
      userId: user.id,
      role: membership.role,
      permissionOverrides: membership.permissions,
      threadId: id,
      content: content || 'Analise os arquivos anexados e indique dados úteis, pendências e próximos passos.',
      attachments: await Promise.all(files.map(async (file) => ({ name: file.name, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()) }))),
      dataAuthorized: form.get('dataAuthorized') === 'yes',
    });
    return NextResponse.redirect(publicAppUrl(`/copilot/${id}`), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(publicAppUrl(`/copilot/${id}?error=${encodeURIComponent(message.slice(0, 300))}`), 303);
  }
}
