import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { emAndamento, parseList } from '@/lib/constants';

/**
 * Cruza casos que estavam "SEMANA" em W1 com a foto ATUAL para medir resolução.
 * Chave de cruzamento: clienteNome + operadoraGrupo + dataRecebimento + compRecebimento.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const operadoras = parseList(searchParams.get('operadoras'));
  const hospitais = parseList(searchParams.get('hospitais'));

  const [atual, w1] = await Promise.all([
    prisma.arquivoCarregado.findFirst({ where: { slotPeriodo: 'ATUAL' } }),
    prisma.arquivoCarregado.findFirst({ where: { slotPeriodo: 'W1' } }),
  ]);
  if (!atual || !w1) {
    return NextResponse.json({ available: false });
  }

  const w1Where: any = { arquivoId: w1.id, status: 'SEMANA' };
  if (operadoras.length) w1Where.operadoraGrupo = { in: operadoras };
  if (hospitais.length) w1Where.hospitalAlias = { in: hospitais };

  const [w1Casos, atualCasos] = await Promise.all([
    prisma.casoGlosa.findMany({
      where: w1Where,
      select: {
        clienteNome: true,
        operadoraGrupo: true,
        hospitalAlias: true,
        dataRecebimento: true,
        compRecebimento: true,
        glosaNaoSubmetida: true,
        glosaNaoAnalisada: true,
      },
    }),
    prisma.casoGlosa.findMany({
      where: { arquivoId: atual.id },
      select: {
        clienteNome: true,
        operadoraGrupo: true,
        dataRecebimento: true,
        compRecebimento: true,
        glosaNaoSubmetida: true,
        glosaNaoAnalisada: true,
      },
    }),
  ]);

  if (!w1Casos.length) {
    return NextResponse.json({ available: false });
  }

  const keyOf = (c: {
    clienteNome: string;
    operadoraGrupo: string;
    dataRecebimento: Date | null;
    compRecebimento: string;
  }) =>
    `${c.clienteNome}|${c.operadoraGrupo}|${c.dataRecebimento?.toISOString() ?? ''}|${c.compRecebimento}`;

  const atualMap = new Map<string, number>();
  for (const c of atualCasos) {
    atualMap.set(keyOf(c), (atualMap.get(keyOf(c)) ?? 0) + emAndamento(c));
  }

  type Grupo = {
    operadora: string;
    hospital: string;
    valorW1: number;
    valorAtual: number;
    casosW1: number;
  };
  const grupos = new Map<string, Grupo>();

  for (const c of w1Casos) {
    const gkey = `${c.operadoraGrupo}|||${c.hospitalAlias}`;
    const g =
      grupos.get(gkey) ??
      {
        operadora: c.operadoraGrupo,
        hospital: c.hospitalAlias,
        valorW1: 0,
        valorAtual: 0,
        casosW1: 0,
      };
    g.valorW1 += emAndamento(c);
    g.valorAtual += atualMap.get(keyOf(c)) ?? 0;
    g.casosW1 += 1;
    grupos.set(gkey, g);
  }

  const items = Array.from(grupos.values())
    .map((g) => {
      let resultado: 'RESOLVIDO' | 'PARCIAL' | 'PENDENTE';
      if (g.valorAtual <= 0.01) resultado = 'RESOLVIDO';
      else if (g.valorAtual < g.valorW1 - 0.01) resultado = 'PARCIAL';
      else resultado = 'PENDENTE';
      return { ...g, diff: g.valorW1 - g.valorAtual, resultado };
    })
    .sort((a, b) => b.valorW1 - a.valorW1);

  const resumo = {
    total: items.length,
    valorTotal: items.reduce((s, i) => s + i.valorW1, 0),
    resolvidos: items.filter((i) => i.resultado === 'RESOLVIDO').length,
    valorResolvido: items
      .filter((i) => i.resultado === 'RESOLVIDO')
      .reduce((s, i) => s + i.valorW1, 0),
    parciais: items.filter((i) => i.resultado === 'PARCIAL').length,
    valorParcial: items
      .filter((i) => i.resultado === 'PARCIAL')
      .reduce((s, i) => s + i.valorW1, 0),
    pendentes: items.filter((i) => i.resultado === 'PENDENTE').length,
    valorPendente: items
      .filter((i) => i.resultado === 'PENDENTE')
      .reduce((s, i) => s + i.valorW1, 0),
  };

  return NextResponse.json({ available: true, resumo, items });
}
