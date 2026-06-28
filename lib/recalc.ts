import { prisma } from './prisma';
import {
  normalizeOperadora,
  calcDataLimite,
  calcStatus,
  calcDiasRestantes,
} from './prazo-calculator';

/**
 * Recalcula prazo-limite / status / dias restantes APENAS do slot ATUAL.
 * REGRA CRÍTICA (ARQUITETURA.md §4.6 / §14): nunca recalcular W1/W2/W3,
 * que são snapshots congelados da data do upload.
 */
export async function recalcularSlotAtual(
  today: Date = new Date(),
): Promise<{ atualizados: number; semArquivo: boolean }> {
  const prazos = await prisma.prazoOperadora.findMany();
  const prazoMap = new Map<string, number>();
  for (const p of prazos) {
    if (p.prazoDias != null) {
      prazoMap.set(normalizeOperadora(p.nomeOperadora), p.prazoDias);
    }
  }

  const arquivo = await prisma.arquivoCarregado.findFirst({
    where: { slotPeriodo: 'ATUAL' },
  });
  if (!arquivo) return { atualizados: 0, semArquivo: true };

  const casos = await prisma.casoGlosa.findMany({
    where: { arquivoId: arquivo.id },
    select: { id: true, operadoraGrupo: true, dataRecebimento: true },
  });

  // Agrupa casos que compartilham (operadora, dataRecebimento) -> mesmo prazo.
  const grupos = new Map<
    string,
    { ids: string[]; dataRecebimento: Date | null; operadoraGrupo: string }
  >();
  for (const c of casos) {
    const key = `${c.operadoraGrupo}|${c.dataRecebimento?.toISOString() ?? 'null'}`;
    const g = grupos.get(key);
    if (g) g.ids.push(c.id);
    else
      grupos.set(key, {
        ids: [c.id],
        dataRecebimento: c.dataRecebimento,
        operadoraGrupo: c.operadoraGrupo,
      });
  }

  let atualizados = 0;
  for (const g of grupos.values()) {
    const prazoDias = prazoMap.get(normalizeOperadora(g.operadoraGrupo)) ?? null;
    const dataLimite = calcDataLimite(g.dataRecebimento, prazoDias);
    const status = calcStatus(dataLimite, today);
    const diasRestantes = calcDiasRestantes(dataLimite, today);

    // Atualiza em lotes para não estourar o IN.
    for (let i = 0; i < g.ids.length; i += 1000) {
      const chunk = g.ids.slice(i, i + 1000);
      const res = await prisma.casoGlosa.updateMany({
        where: { id: { in: chunk } },
        data: { dataLimiteCalculada: dataLimite, status, diasRestantes },
      });
      atualizados += res.count;
    }
  }

  return { atualizados, semArquivo: false };
}
