import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canEditPrazos } from '@/lib/session';
import { normalizeOperadora } from '@/lib/prazo-calculator';
import { recalcularSlotAtual } from '@/lib/recalc';

/** GET: lista os prazos + auto-sync (cria pendentes p/ operadoras de CSV ainda sem prazo). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Busca prazos e operadoras-dos-casos em paralelo (menos round trips).
  const [prazos, casos] = await Promise.all([
    prisma.prazoOperadora.findMany(),
    prisma.casoGlosa.findMany({
      select: { operadoraGrupo: true },
      distinct: ['operadoraGrupo'],
    }),
  ]);
  const normSet = new Set(prazos.map((p) => normalizeOperadora(p.nomeOperadora)));

  // Auto-sync: operadoras presentes nos casos mas sem registro de prazo.
  const novas: { nomeOperadora: string; prazoDias: null }[] = [];
  const vistos = new Set<string>();
  for (const c of casos) {
    const norm = normalizeOperadora(c.operadoraGrupo);
    if (!norm || normSet.has(norm) || vistos.has(norm)) continue;
    vistos.add(norm);
    novas.push({ nomeOperadora: c.operadoraGrupo, prazoDias: null });
  }

  // Só consulta de novo se realmente criou pendentes.
  let todos = prazos;
  if (novas.length) {
    await prisma.prazoOperadora.createMany({ data: novas });
    todos = await prisma.prazoOperadora.findMany();
  }

  // Pendentes (prazoDias null) primeiro
  todos.sort((a, b) => {
    const ap = a.prazoDias == null ? 0 : 1;
    const bp = b.prazoDias == null ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.nomeOperadora.localeCompare(b.nomeOperadora);
  });

  return NextResponse.json({
    prazos: todos,
    pendentes: todos.filter((p) => p.prazoDias == null).length,
  });
}

/** POST: cria/atualiza prazo e recalcula APENAS o slot ATUAL. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canEditPrazos(user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const nomeOperadora = String(body?.nomeOperadora || '').trim();
  if (!nomeOperadora) {
    return NextResponse.json({ error: 'nomeOperadora obrigatório' }, { status: 400 });
  }
  let prazoDias: number | null = null;
  if (body.prazoDias !== null && body.prazoDias !== undefined && body.prazoDias !== '') {
    const n = parseInt(String(body.prazoDias), 10);
    if (isNaN(n) || n < 0) {
      return NextResponse.json({ error: 'prazoDias inválido' }, { status: 400 });
    }
    prazoDias = n;
  }

  const prazo = await prisma.prazoOperadora.upsert({
    where: { nomeOperadora },
    update: { prazoDias },
    create: { nomeOperadora, prazoDias },
  });

  const recalc = await recalcularSlotAtual(new Date());
  return NextResponse.json({ prazo, recalc });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canEditPrazos(user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  await prisma.prazoOperadora.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
