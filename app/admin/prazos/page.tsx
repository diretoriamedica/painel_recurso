'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import { AlertTriangle, Save, Trash2, Plus } from 'lucide-react';

export default function PrazosPage() {
  const [prazos, setPrazos] = useState<any[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [novo, setNovo] = useState({ nomeOperadora: '', prazoDias: '' });
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const d = await apiFetch('/api/prazos').then((r) => r.json());
    setPrazos(d.prazos || []);
    setPendentes(d.pendentes || 0);
    setEdits({});
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(nomeOperadora: string, prazoDias: string) {
    const res = await apiFetch('/api/prazos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeOperadora,
        prazoDias: prazoDias === '' ? null : prazoDias,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Erro ao salvar.');
      return;
    }
    const n = data.recalc?.atualizados ?? 0;
    toast.success(`Prazo salvo. ${n} caso(s) do ATUAL recalculado(s).`);
    carregar();
  }

  async function adicionar() {
    if (!novo.nomeOperadora.trim()) {
      toast.error('Informe o nome da operadora.');
      return;
    }
    await salvar(novo.nomeOperadora.trim(), novo.prazoDias);
    setNovo({ nomeOperadora: '', prazoDias: '' });
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este prazo?')) return;
    const res = await apiFetch(`/api/prazos?id=${id}`, { method: 'DELETE' });
    if (!res.ok) toast.error('Erro ao excluir.');
    else toast.success('Prazo removido.');
    carregar();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#263578]">Prazos por Operadora</h1>

      {pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <strong>{pendentes} operadora(s) sem prazo.</strong> Defina os dias abaixo — as
            pendentes aparecem primeiro.
          </div>
        </div>
      )}

      {/* Adicionar */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-[#444] mb-1">Operadora</label>
            <input
              value={novo.nomeOperadora}
              onChange={(e) => setNovo((n) => ({ ...n, nomeOperadora: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Nome da operadora"
            />
          </div>
          <div>
            <label className="block text-xs text-[#444] mb-1">Prazo (dias)</label>
            <input
              type="number"
              value={novo.prazoDias}
              onChange={(e) => setNovo((n) => ({ ...n, prazoDias: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-28"
              placeholder="ex: 60"
            />
          </div>
          <button
            onClick={adicionar}
            className="flex items-center gap-2 bg-[#F07F00] hover:bg-[#d96e00] text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#263578] text-white px-5 py-3 font-semibold">Operadoras</div>
        <div className="p-5 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="spinner w-8 h-8" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#444] border-b">
                  <th className="py-2 px-3">Operadora</th>
                  <th className="py-2 px-3">Prazo (dias)</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {prazos.map((p) => {
                  const pendente = p.prazoDias == null;
                  const val = edits[p.id] ?? (p.prazoDias == null ? '' : String(p.prazoDias));
                  return (
                    <tr
                      key={p.id}
                      className={`border-b last:border-0 ${pendente ? 'bg-amber-50' : ''}`}
                    >
                      <td className="py-2 px-3">
                        {p.nomeOperadora}
                        {pendente && (
                          <span className="ml-2 text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5">
                            ⏳ pendente
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setEdits((ed) => ({ ...ed, [p.id]: e.target.value }))
                          }
                          className="border rounded-lg px-2 py-1 text-sm w-28"
                          placeholder="dias"
                        />
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => salvar(p.nomeOperadora, val)}
                          className="text-[#006C6D] hover:text-[#005A5B] mr-3"
                          title="Salvar"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => excluir(p.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
