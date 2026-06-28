/**
 * Lógica central de prazos do Gestor de Glosas.
 * Regras (ARQUITETURA.md §4): semáforo VENCIDO / SEMANA / FUTURO / SEM_PRAZO.
 */

export type StatusGlosa = 'VENCIDO' | 'SEMANA' | 'FUTURO' | 'SEM_PRAZO';

/** Normaliza nome de operadora p/ comparação: remove acentos e espaços, uppercase. */
export function normalizeOperadora(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

function atMidnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Próximo domingo após a data (se hoje for domingo, avança uma semana). */
export function getNextSunday(today: Date): Date {
  const d = atMidnight(today);
  const day = d.getDay(); // 0 = domingo
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  return d;
}

/** dataLimite = dataRecebimento + prazoDias (null se faltar algum). */
export function calcDataLimite(
  dataRecebimento: Date | null | undefined,
  prazoDias: number | null | undefined,
): Date | null {
  if (!dataRecebimento || prazoDias == null) return null;
  const d = atMidnight(dataRecebimento);
  d.setDate(d.getDate() + prazoDias);
  return d;
}

/** Dias restantes até o prazo-limite (negativo = vencido). */
export function calcDiasRestantes(
  dataLimite: Date | null,
  today: Date,
): number | null {
  if (!dataLimite) return null;
  const a = atMidnight(dataLimite).getTime();
  const b = atMidnight(today).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Status semáforo. */
export function calcStatus(dataLimite: Date | null, today: Date): StatusGlosa {
  if (!dataLimite) return 'SEM_PRAZO';
  const diffDays = calcDiasRestantes(dataLimite, today)!;
  if (diffDays < 0) return 'VENCIDO';
  const dl = atMidnight(dataLimite);
  if (dl <= getNextSunday(today)) return 'SEMANA';
  return 'FUTURO';
}
