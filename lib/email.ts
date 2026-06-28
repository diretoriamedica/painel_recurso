import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export function isEmailConfigured(): boolean {
  return !!apiKey && !apiKey.includes('REPLACE');
}

export async function sendNotificationEmail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ id?: string; skipped?: boolean; reason?: string }> {
  if (!resend || !isEmailConfigured()) {
    return { skipped: true, reason: 'RESEND_API_KEY não configurada' };
  }
  if (!params.to.length) {
    return { skipped: true, reason: 'Nenhum destinatário' };
  }
  const from = process.env.RESEND_FROM || 'Painel Recurso <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  if (error) throw new Error(error.message || 'Falha ao enviar e-mail');
  return { id: data?.id };
}
