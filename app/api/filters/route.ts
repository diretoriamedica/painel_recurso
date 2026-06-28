import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const arquivo = await prisma.arquivoCarregado.findFirst({
    where: { slotPeriodo: 'ATUAL' },
  });
  if (!arquivo) return NextResponse.json({ operadoras: [], hospitais: [] });

  const casos = await prisma.casoGlosa.findMany({
    where: { arquivoId: arquivo.id },
    select: { operadoraGrupo: true, hospitalAlias: true },
  });

  const operadoras = Array.from(
    new Set(casos.map((c) => c.operadoraGrupo).filter(Boolean)),
  ).sort();
  const hospitais = Array.from(
    new Set(casos.map((c) => c.hospitalAlias).filter(Boolean)),
  ).sort();

  return NextResponse.json({ operadoras, hospitais });
}
