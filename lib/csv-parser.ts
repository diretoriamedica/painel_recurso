import { parse } from 'csv-parse/sync';

/**
 * Parser do CSV semanal de glosas (ARQUITETURA.md §3).
 * Encoding latin1, delimitador vírgula, 28 colunas.
 */

export interface ParsedCaso {
  hospitalReg: string;
  hospitalAlias: string;
  clienteNome: string;
  hospitalCnpj: string;
  operadoraGrupo: string;
  operadoraNome: string;
  convenioTipoPagamento: string;
  dataRecebimento: Date | null;
  dataGuiaPagamento: Date | null;
  dataSubmissaoAnalise: Date | null;
  valorFaturado: number;
  valorRecebido: number;
  valorGlosa: number;
  guiaPrazoEnvioRecurso: Date | null;
  glosaNaoSubmetida: number;
  glosaNaoAnalisada: number;
  valorAceito: number;
  valorRecursado: number;
  valorRecursoRecebido: number;
  valorGlosaMantida: number;
  glosaMantidaNaoSubmetida: number;
  glosaNaoAnalisadaMantida: number;
  valorAceitoMantido: number;
  valorRecursadoMantido: number;
  compRecebimento: string;
  mes: number;
  ano: number;
  ccDataAtualizacao: Date | null;
}

type ColType = 'str' | 'num' | 'int' | 'date';

interface ColSpec {
  field: keyof ParsedCaso;
  headers: string[]; // cabeçalhos normalizados aceitos
  type: ColType;
}

/** Ordem das 28 colunas conforme a spec (usada como fallback posicional). */
const COLUMNS: ColSpec[] = [
  { field: 'hospitalReg', headers: ['hospitalreg'], type: 'str' },
  { field: 'hospitalAlias', headers: ['hospitalalias'], type: 'str' },
  { field: 'clienteNome', headers: ['clientenome'], type: 'str' },
  { field: 'hospitalCnpj', headers: ['hospitalcnpj'], type: 'str' },
  { field: 'operadoraGrupo', headers: ['operadoragrupo'], type: 'str' },
  { field: 'operadoraNome', headers: ['operadoranome'], type: 'str' },
  { field: 'convenioTipoPagamento', headers: ['conveniotipopagamento'], type: 'str' },
  { field: 'dataRecebimento', headers: ['rrecebimentodatarecebimento', 'datarecebimento'], type: 'date' },
  { field: 'dataGuiaPagamento', headers: ['gguiadatapagamento'], type: 'date' },
  { field: 'dataSubmissaoAnalise', headers: ['gguiasubmissaoparaanalisedata'], type: 'date' },
  { field: 'valorFaturado', headers: ['valorfaturado'], type: 'num' },
  { field: 'valorRecebido', headers: ['valorrecebido'], type: 'num' },
  { field: 'valorGlosa', headers: ['valorglosa'], type: 'num' },
  { field: 'guiaPrazoEnvioRecurso', headers: ['guiaprazoenviorecurso'], type: 'date' },
  { field: 'glosaNaoSubmetida', headers: ['glosainicialnaosubmetida', 'glosanaosubmetida'], type: 'num' },
  { field: 'glosaNaoAnalisada', headers: ['glosanaoanalisada'], type: 'num' },
  { field: 'valorAceito', headers: ['valoraceito'], type: 'num' },
  { field: 'valorRecursado', headers: ['valorrecursado'], type: 'num' },
  { field: 'valorRecursoRecebido', headers: ['valorrecursorecebido'], type: 'num' },
  { field: 'valorGlosaMantida', headers: ['valorglosamantida'], type: 'num' },
  { field: 'glosaMantidaNaoSubmetida', headers: ['glosamantidanaosubmetida'], type: 'num' },
  { field: 'glosaNaoAnalisadaMantida', headers: ['glosanaoanalisadamantida'], type: 'num' },
  { field: 'valorAceitoMantido', headers: ['valoraceitomantido'], type: 'num' },
  { field: 'valorRecursadoMantido', headers: ['valorrecursadomantido'], type: 'num' },
  { field: 'compRecebimento', headers: ['comprecebimento'], type: 'str' },
  { field: 'mes', headers: ['mes'], type: 'int' },
  { field: 'ano', headers: ['ano'], type: 'int' },
  { field: 'ccDataAtualizacao', headers: ['ccdataatualizacaomaisrecente', 'ccdataatualizacao'], type: 'date' },
];

function normHeader(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function parseFloat2(val: any): number {
  if (val == null) return 0;
  let s = String(val).trim();
  if (!s || s === '-') return 0;
  s = s.replace(/[R$\s]/gi, '');
  if (s.includes(',') && s.includes('.')) {
    // formato pt-BR: 1.234,56
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseIntSafe(val: any): number {
  const n = parseInt(String(val ?? '').trim(), 10);
  return isNaN(n) ? 0 : n;
}

export function parseDate(val: any): Date | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === '-') return null;
  // DD/MM/YYYY (com hora opcional)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const dt = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    return isNaN(dt.getTime()) ? null : dt;
  }
  // YYYY-MM-DD (com hora opcional)
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const dt = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function convert(type: ColType, raw: any): any {
  switch (type) {
    case 'num':
      return parseFloat2(raw);
    case 'int':
      return parseIntSafe(raw);
    case 'date':
      return parseDate(raw);
    default:
      return String(raw ?? '').trim();
  }
}

function emptyCaso(): ParsedCaso {
  const c: any = {};
  for (const col of COLUMNS) {
    c[col.field] =
      col.type === 'num' || col.type === 'int' ? 0 : col.type === 'date' ? null : '';
  }
  return c as ParsedCaso;
}

/**
 * Lê o buffer do CSV (latin1) e devolve os casos parseados.
 * Tenta mapear por cabeçalho; se não reconhecer, usa ordem posicional das 28 colunas.
 */
export function parseCsvBuffer(buffer: Buffer): ParsedCaso[] {
  const text = buffer.toString('latin1');

  // Auto-detecta o separador a partir do cabeçalho (vírgula, ponto-e-vírgula ou tab).
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const cand: Array<[string, number]> = [
    [',', (firstLine.match(/,/g) || []).length],
    [';', (firstLine.match(/;/g) || []).length],
    ['\t', (firstLine.match(/\t/g) || []).length],
  ];
  cand.sort((a, b) => b[1] - a[1]);
  const delimiter = cand[0][1] > 0 ? cand[0][0] : ',';

  const rows: string[][] = parse(text, {
    delimiter,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true,
    bom: true,
  });

  if (!rows.length) return [];

  const header = rows[0].map(normHeader);
  // Mapa header-normalizado -> índice da coluna
  const headerIndex = new Map<string, number>();
  header.forEach((h, i) => {
    if (h && !headerIndex.has(h)) headerIndex.set(h, i);
  });

  // Quantos campos conseguimos casar por cabeçalho?
  const fieldToIndex = new Map<keyof ParsedCaso, number>();
  for (const col of COLUMNS) {
    for (const h of col.headers) {
      if (headerIndex.has(h)) {
        fieldToIndex.set(col.field, headerIndex.get(h)!);
        break;
      }
    }
  }

  const useHeader = fieldToIndex.size >= COLUMNS.length / 2;
  const dataRows = useHeader ? rows.slice(1) : rows;

  const result: ParsedCaso[] = [];
  for (const row of dataRows) {
    if (!row || row.every((v) => !String(v ?? '').trim())) continue;
    const caso = emptyCaso();
    COLUMNS.forEach((col, posIdx) => {
      const idx = useHeader ? fieldToIndex.get(col.field) ?? -1 : posIdx;
      if (idx >= 0 && idx < row.length) {
        (caso as any)[col.field] = convert(col.type, row[idx]);
      }
    });
    result.push(caso);
  }

  return result;
}
