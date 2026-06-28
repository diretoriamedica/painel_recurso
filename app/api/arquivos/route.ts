import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canUpload } from '@/lib/session';
import { SLOTS } from '@/lib/constants';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const arquivos = await prisma.arquivoCarregado.findMany({
    orderBy: { dataUpload: 'desc' },
    include: { _count: { select: { casos: true } } },
  });

  return NextResponse.json({
    arquivos: arquivos.map((a) => ({
      id: a.id,
      nomeArquivo: a.nomeArquivo,
      slotPeriodo: a.slotPeriodo,
      dataUpload: a.dataUpload,
      totalCasos: a._count.casos,
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canUpload(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const slot = body.slotPeriodo ? String(body.slotPeriodo) : null;
  if (slot && !SLOTS.includes(slot as any)) {
    return NextResponse.json({ error: 'Slot inválido' }, { status: 400 });
  }

  // Unicidade de slot: nenhum outro arquivo pode ocupar o mesmo slot.
  if (slot) {
    const ocupado = await prisma.arquivoCarregado.findFirst({
      where: { slotPeriodo: slot, id: { not: String(body.id) } },
    });
    if (ocupado) {
      return NextResponse.json(
        {
          error: `O slot ${slot} já está ocupado por "${ocupado.nomeArquivo}". Libere-o antes.`,
        },
        { status: 409 },
      );
    }
  }

  const arquivo = await prisma.arquivoCarregado.update({
    where: { id: String(body.id) },
    data: { slotPeriodo: slot },
  });
  return NextResponse.json({ arquivo });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canUpload(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  // Casos são removidos em cascata (onDelete: Cascade).
  await prisma.arquivoCarregado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
