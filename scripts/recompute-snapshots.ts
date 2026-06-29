import { prisma } from '../lib/prisma';
import {
  normalizeOperadora,
  calcDataLimite,
  calcStatus,
  calcDiasRestantes,
  dataReferenciaArquivo,
} from '../lib/prazo-calculator';

// Recalcula o status dos snapshots históricos (W1/W2/W3) usando a data de
// referência (semana) de cada arquivo, corrigindo o backfill feito hoje.
async function main() {
  const prazos = await prisma.prazoOperadora.findMany();
  const prazoMap = new Map<string, number>();
  for (const p of prazos) {
    if (p.prazoDias != null) prazoMap.set(normalizeOperadora(p.nomeOperadora), p.prazoDias);
  }

  const arquivos = await prisma.arquivoCarregado.findMany({
    where: { slotPeriodo: { in: ['W1', 'W2', 'W3'] } },
  });

  const esc = (s: string) => s.replace(/'/g, "''");

  for (const arq of arquivos) {
    const ref = dataReferenciaArquivo(arq.nomeArquivo);
    const casos = await prisma.casoGlosa.findMany({
      where: { arquivoId: arq.id },
      select: { id: true, operadoraGrupo: true, dataRecebimento: true },
    });
    const updates = casos.map((c) => {
      const prazoDias = prazoMap.get(normalizeOperadora(c.operadoraGrupo)) ?? null;
      const dl = calcDataLimite(c.dataRecebimento, prazoDias);
      return { id: c.id, dl, st: calcStatus(dl, ref), dr: calcDiasRestantes(dl, ref) };
    });
    let n = 0;
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      const values = chunk
        .map(
          (u) =>
            `('${esc(u.id)}', ${u.dl ? `'${u.dl.toISOString()}'::timestamp` : 'NULL::timestamp'}, '${u.st}', ${u.dr === null ? 'NULL::int' : `${u.dr}::int`})`,
        )
        .join(',');
      n += await prisma.$executeRawUnsafe(
        `UPDATE "CasoGlosa" AS c SET "dataLimiteCalculada"=v.dl,"status"=v.st,"diasRestantes"=v.dr FROM (VALUES ${values}) AS v(id,dl,st,dr) WHERE c.id=v.id`,
      );
    }
    console.log(
      `${arq.slotPeriodo} ref=${ref.toISOString().slice(0, 10)} -> ${n} casos recalculados`,
    );
  }
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
