import fs from 'fs';
import { prisma } from '../lib/prisma';
import { recalcularSlotAtual } from '../lib/recalc';

// Importa a lista oficial de prazos (painel original) substituindo a tabela inteira,
// limpando os registros-lixo, e recalcula o slot ATUAL.
const F = process.argv[2] || '/Users/lucasalb/Downloads/table.csv';

async function main() {
  const text = fs.readFileSync(F, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].toLowerCase();
  const dataLines = header.includes('operadora') ? lines.slice(1) : lines;

  const ops = dataLines
    .map((l) => {
      const i = l.indexOf(',');
      if (i < 0) return null;
      const nome = l.slice(0, i).trim();
      const prazoStr = l.slice(i + 1).trim();
      const m = prazoStr.match(/-?\d+/);
      return nome ? { nome, prazo: m ? parseInt(m[0], 10) : null } : null;
    })
    .filter((x): x is { nome: string; prazo: number | null } => !!x);

  console.log('linhas lidas de table.csv:', ops.length);

  const before = await prisma.prazoOperadora.count();
  await prisma.prazoOperadora.deleteMany({});
  console.log('PrazoOperadora apagadas (lixo + seed):', before);

  for (const o of ops) {
    await prisma.prazoOperadora.create({
      data: { nomeOperadora: o.nome, prazoDias: o.prazo },
    });
  }
  console.log('PrazoOperadora importadas:', ops.length);

  const r = await recalcularSlotAtual(new Date());
  console.log('Recalculo ATUAL:', JSON.stringify(r));

  const total = await prisma.prazoOperadora.count();
  console.log('Total final de prazos:', total);
}

main()
  .catch((e) => {
    console.error(String(e).slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
