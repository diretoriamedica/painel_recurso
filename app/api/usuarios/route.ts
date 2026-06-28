import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isAdmin: true,
  canUpload: true,
  canEditPrazos: true,
  recebeNotificacoes: true,
  aprovado: true,
  createdAt: true,
};

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: 'Não autenticado', status: 401 as const };
  if (!user.isAdmin) return { error: 'Acesso restrito a administradores', status: 403 as const };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const usuarios = await prisma.user.findMany({
    select: SELECT,
    orderBy: [{ aprovado: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ usuarios });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });

  const name = String(body.name || '').trim();
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: 'Nome, e-mail e senha (mín. 8 caracteres) são obrigatórios.' },
      { status: 400 },
    );
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      phone: String(body.phone || '').trim(),
      isAdmin: !!body.isAdmin,
      canUpload: !!body.canUpload,
      canEditPrazos: !!body.canEditPrazos,
      recebeNotificacoes: !!body.recebeNotificacoes,
      aprovado: body.aprovado !== undefined ? !!body.aprovado : true,
    },
    select: SELECT,
  });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const data: Record<string, unknown> = {};
  for (const f of ['name', 'phone']) {
    if (body[f] !== undefined) data[f] = String(body[f]).trim();
  }
  for (const f of ['isAdmin', 'canUpload', 'canEditPrazos', 'recebeNotificacoes', 'aprovado']) {
    if (body[f] !== undefined) data[f] = !!body[f];
  }
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: 'Senha muito curta.' }, { status: 400 });
    }
    data.password = await bcrypt.hash(String(body.password), 12);
  }
  // Protege o próprio admin de remover seu acesso admin
  if (body.id === auth.user!.id && body.isAdmin === false) {
    return NextResponse.json(
      { error: 'Você não pode remover o próprio acesso de administrador.' },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: String(body.id) },
    data,
    select: SELECT,
  });
  return NextResponse.json({ user });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  if (id === auth.user!.id) {
    return NextResponse.json(
      { error: 'Você não pode excluir a si mesmo.' },
      { status: 400 },
    );
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
