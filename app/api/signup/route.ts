import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const phone = String(body.phone || '').trim();

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Nome e e-mail são obrigatórios.' },
      { status: 400 },
    );
  }
  if (password.length < 8 || password.length > 64) {
    return NextResponse.json(
      { error: 'A senha deve ter entre 8 e 64 caracteres.' },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: 'E-mail já cadastrado.' },
      { status: 409 },
    );
  }

  const count = await prisma.user.count();
  const isFirst = count === 0; // primeiro usuário vira admin aprovado

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      phone,
      isAdmin: isFirst,
      canUpload: isFirst,
      canEditPrazos: isFirst,
      recebeNotificacoes: isFirst,
      aprovado: isFirst,
    },
  });

  return NextResponse.json({ aprovado: user.aprovado });
}
