export const SLOTS = ['ATUAL', 'W1', 'W2', 'W3'] as const;
export type Slot = (typeof SLOTS)[number];

export const MAX_FILES = 4;

export const STATUS_SEMAFORO = ['VENCIDO', 'SEMANA', 'FUTURO'] as const;
export type StatusSemaforo = (typeof STATUS_SEMAFORO)[number];

/** Métrica central: "Glosa Inicial em Andamento" (ARQUITETURA.md §4.1). */
export function emAndamento(c: {
  glosaNaoSubmetida?: number | null;
  glosaNaoAnalisada?: number | null;
}): number {
  return (c.glosaNaoSubmetida || 0) + (c.glosaNaoAnalisada || 0);
}

/** Converte "?operadoras=a,b" em lista. */
export function parseList(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
