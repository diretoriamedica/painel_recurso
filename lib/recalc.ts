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
 *
 * Atualiza em lote via UPDATE ... FROM (VALUES ...) — poucas round-trips
 * (chunks de 500), em vez de um updateMany por grupo.
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

  const updates = casos.map((c) => {
    const prazoDias = prazoMap.get(normalizeOperadora(c.operadoraGrupo)) ?? null;
    const dataLimite = calcDataLimite(c.dataRecebimento, prazoDias);
    return {
      id: c.id,
      dl: dataLimite,
      st: calcStatus(dataLimite, today),
      dr: calcDiasRestantes(dataLimite, today),
    };
  });

  const esc = (s: string) => s.replace(/'/g, "''");
  let atualizados = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const chunk = updates.slice(i, i + 500);
    const values = chunk
      .map(
        (u) =>
          `('${esc(u.id)}', ${
            u.dl ? `'${u.dl.toISOString()}'::timestamp` : 'NULL::timestamp'
          }, '${u.st}', ${u.dr === null ? 'NULL::int' : `${u.dr}::int`})`,
      )
      .join(',');
    const sql = `UPDATE "CasoGlosa" AS c
      SET "dataLimiteCalculada" = v.dl, "status" = v.st, "diasRestantes" = v.dr
      FROM (VALUES ${values}) AS v(id, dl, st, dr)
      WHERE c.id = v.id`;
    atualizados += await prisma.$executeRawUnsafe(sql);
  }

  return { atualizados, semArquivo: false };
}
