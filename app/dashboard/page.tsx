'use client';

import { useCallback, useEffect, useState } from 'react';
import { KpiCard } from '@/app/components/kpi-card';
import { MultiSelect } from '@/app/components/multi-select';
import { DataTable, type Column } from '@/app/components/data-table';
import { formatBRL } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';

const SLOT_LABEL: Record<string, string> = {
  ATUAL: 'Atual',
  W1: 'Semana -1',
  W2: 'Semana -2',
  W3: 'Semana -3',
};

function badge(resultado: string) {
  const map: Record<string, string> = {
    RESOLVIDO: 'bg-green-100 text-green-700',
    PARCIAL: 'bg-yellow-100 text-yellow-700',
    PENDENTE: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[resultado] || ''}`}>
      {resultado}
    </span>
  );
}

export default function DashboardPage() {
  const [opcoes, setOpcoes] = useState<{ operadoras: string[]; hospitais: string[] }>({
    operadoras: [],
    hospitais: [],
  });
  const [selOperadoras, setSelOperadoras] = useState<string[]>([]);
  const [selHospitais, setSelHospitais] = useState<string[]>([]);

  const [dash, setDash] = useState<any>(null);
  const [evol, setEvol] = useState<any>(null);
  const [acomp, setAcomp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/filters')
      .then((r) => r.json())
      .then((d) => setOpcoes({ operadoras: d.operadoras || [], hospitais: d.hospitais || [] }))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (selOperadoras.length) qs.set('operadoras', selOperadoras.join(','));
    if (selHospitais.length) qs.set('hospitais', selHospitais.join(','));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    try {
      const [d, e, a] = await Promise.all([
        apiFetch(`/api/dashboard${q}`).then((r) => r.json()),
        apiFetch(`/api/dashboard/evolucao${q}`).then((r) => r.json()),
        apiFetch(`/api/dashboard/acompanhamento${q}`).then((r) => r.json()),
      ]);
      setDash(d);
      setEvol(e);
      setAcomp(a);
    } finally {
      setLoading(false);
    }
  }, [selOperadoras, selHospitais]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const brl = (v: any) => formatBRL(Number(v) || 0);

  const colsUnidade: Column[] = [
    { key: 'hospital', label: 'Unidade' },
    { key: 'VENCIDO', label: 'Vencido', numeric: true, format: brl },
    { key: 'SEMANA', label: 'Esta semana', numeric: true, format: brl },
    { key: 'FUTURO', label: 'Futuro', numeric: true, format: brl },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      format: (_v, r) => brl((r.VENCIDO || 0) + (r.SEMANA || 0) + (r.FUTURO || 0)),
    },
  ];
  const colsOperadora: Column[] = [
    { key: 'operadora', label: 'Operadora' },
    {
      key: 'prazo',
      label: 'Prazo (dias)',
      format: (v) => (v == null ? '⏳ pendente' : String(v)),
    },
    { key: 'VENCIDO', label: 'Vencido', numeric: true, format: brl },
    { key: 'SEMANA', label: 'Esta semana', numeric: true, format: brl },
    { key: 'FUTURO', label: 'Futuro', numeric: true, format: brl },
    {
      key: 'total',
      label: 'Total',
      numeric: true,
      format: (_v, r) => brl((r.VENCIDO || 0) + (r.SEMANA || 0) + (r.FUTURO || 0)),
    },
  ];

  const withTotal = (rows: any[]) =>
    (rows || []).map((r) => ({
      ...r,
      total: (r.VENCIDO || 0) + (r.SEMANA || 0) + (r.FUTURO || 0),
    }));

  const semDados = dash?.empty && !loading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-xl font-bold text-[#263578] mr-auto">Dashboard de Glosas</h1>
        <MultiSelect
          label="Operadoras"
          options={opcoes.operadoras}
          selected={selOperadoras}
          onChange={setSelOperadoras}
        />
        <MultiSelect
          label="Unidades"
          options={opcoes.hospitais}
          selected={selHospitais}
          onChange={setSelHospitais}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="spinner w-10 h-10" />
        </div>
      )}

      {semDados && (
        <div className="bg-white rounded-xl shadow-md p-10 text-center text-[#444444]">
          Nenhum dado no slot <strong>ATUAL</strong>. Faça o upload de um CSV e atribua o slot
          em <a href="/admin/upload" className="text-[#F07F00] font-medium">Upload</a>.
        </div>
      )}

      {!loading && !semDados && dash && (
        <>
          {/* KPIs semáforo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard title="Vencido" valor={dash.kpis.VENCIDO.valor} count={dash.kpis.VENCIDO.count} variant="vencido" />
            <KpiCard title="Esta semana" valor={dash.kpis.SEMANA.valor} count={dash.kpis.SEMANA.count} variant="semana" />
            <KpiCard title="Futuro" valor={dash.kpis.FUTURO.valor} count={dash.kpis.FUTURO.count} variant="futuro" />
          </div>

          {/* Acompanhamento semanal */}
          {acomp?.available && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#263578] to-[#112888] text-white px-5 py-3 font-semibold">
                Acompanhamento Semanal (Semana -1 → Atual)
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-lg bg-[#F2F2F2] p-3">
                    <div className="text-xs text-[#444444]">Total W-1</div>
                    <div className="font-bold text-[#263578]">{brl(acomp.resumo.valorTotal)}</div>
                    <div className="text-xs text-[#444]">{acomp.resumo.total} grupo(s)</div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="text-xs text-green-700">Resolvidos</div>
                    <div className="font-bold text-green-700">{brl(acomp.resumo.valorResolvido)}</div>
                    <div className="text-xs text-green-700">{acomp.resumo.resolvidos}</div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3">
                    <div className="text-xs text-yellow-700">Parciais</div>
                    <div className="font-bold text-yellow-700">{brl(acomp.resumo.valorParcial)}</div>
                    <div className="text-xs text-yellow-700">{acomp.resumo.parciais}</div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3">
                    <div className="text-xs text-red-700">Pendentes</div>
                    <div className="font-bold text-red-700">{brl(acomp.resumo.valorPendente)}</div>
                    <div className="text-xs text-red-700">{acomp.resumo.pendentes}</div>
                  </div>
                </div>

                {acomp.resumo.pendentes === 0 && acomp.resumo.parciais === 0 ? (
                  <div className="bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm">
                    🎉 Tudo da semana anterior foi resolvido!
                  </div>
                ) : (
                  <DataTable
                    showTotals={false}
                    columns={[
                      { key: 'operadora', label: 'Operadora' },
                      { key: 'hospital', label: 'Unidade' },
                      { key: 'valorW1', label: 'Valor W-1', numeric: true, format: brl },
                      { key: 'valorAtual', label: 'Valor Atual', numeric: true, format: brl },
                      { key: 'diff', label: 'Diferença', numeric: true, format: brl },
                      { key: 'resultado', label: 'Status', format: (v) => badge(String(v)) },
                    ]}
                    rows={acomp.items}
                  />
                )}
              </div>
            </div>
          )}

          {/* Por unidade */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#263578] text-white px-5 py-3 font-semibold">Por Unidade</div>
            <div className="p-5">
              <DataTable columns={colsUnidade} rows={withTotal(dash.porUnidade)} />
            </div>
          </div>

          {/* Por operadora */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-[#263578] text-white px-5 py-3 font-semibold">Por Operadora</div>
            <div className="p-5">
              <DataTable columns={colsOperadora} rows={withTotal(dash.porOperadora)} />
            </div>
          </div>

          {/* Evolução */}
          {evol?.linhas && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-[#263578] text-white px-5 py-3 font-semibold">Evolução por Semana</div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#444444] border-b">
                      <th className="py-2 px-3">Semana</th>
                      <th className="py-2 px-3 text-right">Vencido</th>
                      <th className="py-2 px-3 text-right">Esta semana</th>
                      <th className="py-2 px-3 text-right">Futuro</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evol.linhas.map((l: any) => (
                      <tr key={l.slot} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          {SLOT_LABEL[l.slot] || l.slot}
                          {!l.presente && <span className="text-gray-400"> (vazio)</span>}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{brl(l.VENCIDO)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{brl(l.SEMANA)}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{brl(l.FUTURO)}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-semibold">
                          {brl((l.VENCIDO || 0) + (l.SEMANA || 0) + (l.FUTURO || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
