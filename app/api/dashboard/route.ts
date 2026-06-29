import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { emAndamento, parseList, STATUS_SEMAFORO } from '@/lib/constants';
import { normalizeOperadora } from '@/lib/prazo-calculator';

type Bucket = { VENCIDO: number; SEMANA: number; FUTURO: number };
const zeroBucket = (): Bucket => ({ VENCIDO: 0, SEMANA: 0, FUTURO: 0 });

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slot = searchParams.get('slot') || 'ATUAL';
  const operadoras = parseList(searchParams.get('operadoras'));
  const hospitais = parseList(searchParams.get('hospitais'));

  const arquivo = await prisma.arquivoCarregado.findFirst({
    where: { slotPeriodo: slot },
  });
  if (!arquivo) {
    return NextResponse.json({
      empty: true,
      kpis: {
        VENCIDO: { valor: 0, count: 0 },
        SEMANA: { valor: 0, count: 0 },
        FUTURO: { valor: 0, count: 0 },
      },
      porUnidade: [],
      porOperadora: [],
    });
  }

  const where: any = { arquivoId: arquivo.id };
  if (operadoras.length) where.operadoraGrupo = { in: operadoras };
  if (hospitais.length) where.hospitalAlias = { in: hospitais };

  const casos = await prisma.casoGlosa.findMany({
    where,
    select: {
      operadoraGrupo: true,
      hospitalAlias: true,
      status: true,
      glosaNaoSubmetida: true,
      glosaNaoAnalisada: true,
    },
  });

  const prazos = await prisma.prazoOperadora.findMany();
  const prazoMap = new Map<string, number | null>();
  for (const p of prazos) prazoMap.set(normalizeOperadora(p.nomeOperadora), p.prazoDias);

  const kpis = {
    VENCIDO: { valor: 0, count: 0 },
    SEMANA: { valor: 0, count: 0 },
    FUTURO: { valor: 0, count: 0 },
  };
  const unidades = new Map<string, Bucket>();
  const ops = new Map<string, Bucket>();

  for (const c of casos) {
    const v = emAndamento(c);
    const st = c.status as keyof typeof kpis;
    if (STATUS_SEMAFORO.includes(st as any)) {
      kpis[st].valor += v;
      // Conta o caso só se tem glosa em andamento (> 0), como no painel original.
      if (v > 0) kpis[st].count += 1;

      const u = unidades.get(c.hospitalAlias) ?? zeroBucket();
      u[st] += v;
      unidades.set(c.hospitalAlias, u);

      const o = ops.get(c.operadoraGrupo) ?? zeroBucket();
      o[st] += v;
      ops.set(c.operadoraGrupo, o);
    }
  }

  const porUnidade = Array.from(unidades.entries())
    .map(([hospital, b]) => ({ hospital, ...b }))
    .filter((r) => r.VENCIDO + r.SEMANA + r.FUTURO > 0)
    .sort((a, b) => b.VENCIDO + b.SEMANA + b.FUTURO - (a.VENCIDO + a.SEMANA + a.FUTURO));

  const porOperadora = Array.from(ops.entries())
    .map(([operadora, b]) => ({
      operadora,
      ...b,
      prazo: prazoMap.get(normalizeOperadora(operadora)) ?? null,
    }))
    .filter((r) => r.VENCIDO + r.SEMANA + r.FUTURO > 0)
    .sort((a, b) => b.VENCIDO + b.SEMANA + b.FUTURO - (a.VENCIDO + a.SEMANA + a.FUTURO));

  return NextResponse.json({
    empty: casos.length === 0,
    slot,
    nomeArquivo: arquivo.nomeArquivo,
    dataUpload: arquivo.dataUpload,
    kpis,
    porUnidade,
    porOperadora,
  });
}
