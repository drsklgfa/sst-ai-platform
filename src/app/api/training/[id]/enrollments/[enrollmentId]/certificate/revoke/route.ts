import { NextResponse } from 'next/server';
import { authorizeTenantApi } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { revokeTrainingCertificate } from '@/lib/training';
import { publicAppUrl } from '@/lib/public-url';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; enrollmentId: string }> }) {
  if (!env.FEATURE_TRAINING_CERTIFICATES) return new Response('Módulo desativado', { status: 404 });
  const auth = await authorizeTenantApi('training.certificate.issue'); if (auth instanceof Response) return auth;
  const { id, enrollmentId } = await params; const form = await request.formData();
  const certificate = await db.trainingCertificate.findFirst({ where: { tenantId: auth.tenant.id, enrollmentId }, select: { id: true } });
  if (!certificate) return new Response('Certificado não encontrado', { status: 404 });
  try {
    const row = await revokeTrainingCertificate({ tenantId: auth.tenant.id, certificateId: certificate.id, revokedById: auth.user.id, reason: String(form.get('reason') ?? '') });
    await audit({ tenantId: auth.tenant.id, userId: auth.user.id, action: 'TRAINING_CERTIFICATE_REVOKED', entityType: 'TrainingCertificate', entityId: row.id, after: { reason: row.revokedReason } });
    return NextResponse.redirect(publicAppUrl(`/training/${id}`), 303);
  } catch (error) { return new Response(error instanceof Error ? error.message : 'Falha ao revogar certificado', { status: 400 }); }
}
