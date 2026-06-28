import { NextResponse } from 'next/server';
import { getSessionUser, canRecalcular } from '@/lib/session';
import { recalcularSlotAtual } from '@/lib/recalc';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canRecalcular(user)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const result = await recalcularSlotAtual(new Date());
  return NextResponse.json(result);
}
