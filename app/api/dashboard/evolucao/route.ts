import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { emAndamento, parseList, SLOTS, STATUS_SEMAFORO } from '@/lib/constants';

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const operadoras = parseList(searchParams.get('operadoras'));
  const hospitais = parseList(searchParams.get('hospitais'));

  const arquivos = await prisma.arquivoCarregado.findMany({
    where: { slotPeriodo: { in: SLOTS as unknown as string[] } },
  });
  const bySlot = new Map(arquivos.map((a) => [a.slotPeriodo!, a]));

  const linhas = [];
  for (const slot of SLOTS) {
    const arquivo = bySlot.get(slot);
    if (!arquivo) {
      linhas.push({ slot, presente: false, VENCIDO: 0, SEMANA: 0, FUTURO: 0 });
      continue;
    }
    const where: any = { arquivoId: arquivo.id };
    if (operadoras.length) where.operadoraGrupo = { in: operadoras };
    if (hospitais.length) where.hospitalAlias = { in: hospitais };

    const casos = await prisma.casoGlosa.findMany({
      where,
      select: { status: true, glosaNaoSubmetida: true, glosaNaoAnalisada: true },
    });
    const bucket = { VENCIDO: 0, SEMANA: 0, FUTURO: 0 };
    for (const c of casos) {
      if (STATUS_SEMAFORO.includes(c.status as any)) {
        bucket[c.status as keyof typeof bucket] += emAndamento(c);
      }
    }
    linhas.push({
      slot,
      presente: true,
      nomeArquivo: arquivo.nomeArquivo,
      dataUpload: arquivo.dataUpload,
      ...bucket,
    });
  }

  return NextResponse.json({ linhas });
}
