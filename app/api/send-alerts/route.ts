import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { emAndamento } from '@/lib/constants';
import { formatBRL } from '@/lib/formatters';
import { sendNotificationEmail, isEmailConfigured } from '@/lib/email';

const DIAS_LIMITE_ALERTA = 5;

/** Escapa valores derivados do CSV antes de embutir no HTML do e-mail. */
const esc = (s: string) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!user.isAdmin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Resend não configurado. Defina RESEND_API_KEY no .env.' },
      { status: 400 },
    );
  }

  const arquivo = await prisma.arquivoCarregado.findFirst({
    where: { slotPeriodo: 'ATUAL' },
  });
  if (!arquivo) {
    return NextResponse.json({ error: 'Nenhum arquivo no slot ATUAL.' }, { status: 400 });
  }

  const casos = await prisma.casoGlosa.findMany({
    where: {
      arquivoId: arquivo.id,
      OR: [
        { status: 'VENCIDO' },
        { diasRestantes: { gte: 0, lte: DIAS_LIMITE_ALERTA } },
      ],
    },
    orderBy: { diasRestantes: 'asc' },
    select: {
      hospitalAlias: true,
      operadoraGrupo: true,
      status: true,
      diasRestantes: true,
      dataLimiteCalculada: true,
      glosaNaoSubmetida: true,
      glosaNaoAnalisada: true,
    },
  });

  if (!casos.length) {
    return NextResponse.json({
      enviado: false,
      reason: 'Nenhum caso urgente (vencido ou vencendo em até 5 dias).',
    });
  }

  const destinatariosUsers = await prisma.user.findMany({
    where: { recebeNotificacoes: true, aprovado: true },
    select: { email: true },
  });
  const destinatarios = destinatariosUsers.map((u) => u.email).filter(Boolean);
  if (!destinatarios.length) {
    return NextResponse.json({
      enviado: false,
      reason: 'Nenhum usuário com "recebe notificações" ativo.',
    });
  }

  const totalUrgente = casos.reduce((s, c) => s + emAndamento(c), 0);

  const linhas = casos
    .slice(0, 200)
    .map((c) => {
      const cor = c.status === 'VENCIDO' ? '#dc2626' : '#d97706';
      const dias =
        c.status === 'VENCIDO'
          ? `Vencido há ${Math.abs(c.diasRestantes ?? 0)} dia(s)`
          : `${c.diasRestantes} dia(s)`;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(c.hospitalAlias) || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${esc(c.operadoraGrupo) || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:${cor};font-weight:600">${dias}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatBRL(emAndamento(c))}</td>
      </tr>`;
    })
    .join('');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:0 auto;color:#263578">
    <div style="background:#263578;color:#fff;padding:20px;border-radius:12px 12px 0 0">
      <h2 style="margin:0">⚠️ Alerta de Prazos de Recurso</h2>
      <p style="margin:6px 0 0;opacity:.85">Painel Recurso · Rede Hospital Casa</p>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 12px 12px">
      <p>Há <strong>${casos.length}</strong> caso(s) vencido(s) ou vencendo em até ${DIAS_LIMITE_ALERTA} dias,
      somando <strong>${formatBRL(totalUrgente)}</strong> em glosa em andamento.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
        <thead>
          <tr style="background:#F2F2F2;text-align:left">
            <th style="padding:8px">Unidade</th>
            <th style="padding:8px">Operadora</th>
            <th style="padding:8px">Prazo</th>
            <th style="padding:8px;text-align:right">Em andamento</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#888">
        Acesse o painel para detalhes e ações. Este é um e-mail automático.
      </p>
    </div>
  </div>`;

  try {
    const res = await sendNotificationEmail({
      to: destinatarios,
      subject: `⚠️ ${casos.length} prazo(s) de recurso urgente(s) — ${formatBRL(totalUrgente)}`,
      html,
    });
    if (res.skipped) {
      return NextResponse.json({ enviado: false, reason: res.reason });
    }
    return NextResponse.json({
      enviado: true,
      destinatarios: destinatarios.length,
      casos: casos.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Falha ao enviar: ${e?.message || e}` },
      { status: 500 },
    );
  }
}
