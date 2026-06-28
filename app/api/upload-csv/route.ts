import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, canUpload } from '@/lib/session';
import { parseCsvBuffer } from '@/lib/csv-parser';
import {
  normalizeOperadora,
  calcDataLimite,
  calcStatus,
  calcDiasRestantes,
} from '@/lib/prazo-calculator';
import { MAX_FILES } from '@/lib/constants';

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!canUpload(user)) {
    return NextResponse.json({ error: 'Sem permissão para upload' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  }

  const totalArquivos = await prisma.arquivoCarregado.count();
  if (totalArquivos >= MAX_FILES) {
    return NextResponse.json(
      { error: `Limite de ${MAX_FILES} arquivos atingido. Exclua um antes de subir outro.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let casos;
  try {
    casos = parseCsvBuffer(buffer);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Falha ao ler o CSV: ${e?.message || e}` },
      { status: 400 },
    );
  }
  if (!casos.length) {
    return NextResponse.json({ error: 'CSV vazio ou inválido.' }, { status: 400 });
  }

  // Salvaguarda: se a coluna de operadora não foi reconhecida (muitos valores numéricos/vazios),
  // o arquivo está em formato inesperado — rejeita em vez de inserir dados-lixo.
  const operadoraRuim = casos.filter((c) => {
    const v = String(c.operadoraGrupo || '').trim();
    return !v || /^-?\d+([.,]\d+)?$/.test(v);
  }).length;
  if (operadoraRuim > casos.length * 0.3) {
    return NextResponse.json(
      {
        error:
          'Formato de CSV inesperado: a coluna de operadora não foi reconhecida. ' +
          'Verifique se é o export correto (cabeçalho padrão, separado por vírgula, decimais com ponto).',
      },
      { status: 400 },
    );
  }

  // Prazos existentes
  const prazos = await prisma.prazoOperadora.findMany();
  const prazoMap = new Map<string, number>();
  const prazoNormSet = new Set<string>();
  for (const p of prazos) {
    const norm = normalizeOperadora(p.nomeOperadora);
    prazoNormSet.add(norm);
    if (p.prazoDias != null) prazoMap.set(norm, p.prazoDias);
  }

  // Detecta operadoras novas (auto-cadastro com prazoDias = null)
  const operadorasNoArquivo = new Map<string, string>();
  for (const c of casos) {
    const norm = normalizeOperadora(c.operadoraGrupo);
    if (norm && !operadorasNoArquivo.has(norm)) {
      operadorasNoArquivo.set(norm, c.operadoraGrupo);
    }
  }
  const operadorasNovas: string[] = [];
  for (const [norm, original] of operadorasNoArquivo) {
    if (!prazoNormSet.has(norm)) {
      await prisma.prazoOperadora.create({
        data: { nomeOperadora: original, prazoDias: null },
      });
      prazoNormSet.add(norm);
      operadorasNovas.push(original);
    }
  }

  // Cria o arquivo (slot atribuído depois pelo usuário)
  const arquivo = await prisma.arquivoCarregado.create({
    data: { nomeArquivo: file.name, slotPeriodo: null, cloudPath: '' },
  });

  const today = new Date();
  const rows = casos.map((c) => {
    const prazoDias = prazoMap.get(normalizeOperadora(c.operadoraGrupo)) ?? null;
    const dataLimite = calcDataLimite(c.dataRecebimento, prazoDias);
    return {
      ...c,
      arquivoId: arquivo.id,
      dataLimiteCalculada: dataLimite,
      status: calcStatus(dataLimite, today),
      diasRestantes: calcDiasRestantes(dataLimite, today),
    };
  });

  for (let i = 0; i < rows.length; i += 200) {
    await prisma.casoGlosa.createMany({ data: rows.slice(i, i + 200) });
  }

  const totalOperadoras = await prisma.prazoOperadora.count();
  const operadorasPendentes = await prisma.prazoOperadora.count({
    where: { prazoDias: null },
  });

  return NextResponse.json({
    arquivoId: arquivo.id,
    nomeArquivo: arquivo.nomeArquivo,
    totalCasos: rows.length,
    operadorasNovas,
    operadorasPendentes,
    totalOperadoras,
  });
}
