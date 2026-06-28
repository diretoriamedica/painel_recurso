'use client';

import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  numeric?: boolean;
  format?: (v: any, row: Record<string, any>) => React.ReactNode;
}

export function DataTable({
  columns,
  rows,
  pageSize = 8,
  showTotals = true,
}: {
  columns: Column[];
  rows: Record<string, any>[];
  pageSize?: number;
  showTotals?: boolean;
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key);
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      return asc
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''));
    });
    return arr;
  }, [rows, sortKey, asc]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const curPage = Math.min(page, pages - 1);
  const pageRows = sorted.slice(curPage * pageSize, (curPage + 1) * pageSize);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const col of columns) {
      if (col.numeric) t[col.key] = rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
    }
    return t;
  }, [rows, columns]);

  function setSort(key: string) {
    if (key === sortKey) setAsc((a) => !a);
    else {
      setSortKey(key);
      setAsc(false);
    }
    setPage(0);
  }

  if (!rows.length) {
    return <div className="text-sm text-gray-400 py-6 text-center">Sem dados.</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#444444] border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => setSort(col.key)}
                  className={`py-2 px-3 cursor-pointer select-none whitespace-nowrap ${
                    col.numeric ? 'text-right' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key &&
                      (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-2 px-3 ${col.numeric ? 'text-right tabular-nums' : ''}`}
                  >
                    {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showTotals && (
            <tfoot>
              <tr className="border-t-2 font-semibold text-[#263578]">
                {columns.map((col, idx) => (
                  <td
                    key={col.key}
                    className={`py-2 px-3 ${col.numeric ? 'text-right tabular-nums' : ''}`}
                  >
                    {idx === 0
                      ? 'Total'
                      : col.numeric
                        ? (col.format
                            ? col.format(totals[col.key], {})
                            : totals[col.key])
                        : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-[#444444]">
          <span>
            Página {curPage + 1} de {pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, curPage - 1))}
              disabled={curPage === 0}
              className="px-3 py-1 rounded border disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(pages - 1, curPage + 1))}
              disabled={curPage >= pages - 1}
              className="px-3 py-1 rounded border disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
