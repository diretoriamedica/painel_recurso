'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { UploadCloud, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

const SLOTS = ['ATUAL', 'W1', 'W2', 'W3'];
const SLOT_LABEL: Record<string, string> = {
  ATUAL: 'Atual',
  W1: 'Semana -1',
  W2: 'Semana -2',
  W3: 'Semana -3',
};

export default function UploadPage() {
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    const [a, p] = await Promise.all([
      fetch('/api/arquivos').then((r) => r.json()),
      fetch('/api/prazos').then((r) => r.json()),
    ]);
    setArquivos(a.arquivos || []);
    setPendentes(p.pendentes || 0);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Selecione um arquivo CSV.');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload-csv', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha no upload.');
      } else {
        toast.success(`${data.totalCasos} caso(s) importado(s).`);
        if (data.operadorasNovas?.length) {
          toast(`${data.operadorasNovas.length} operadora(s) nova(s) — defina os prazos.`, {
            icon: '⏳',
          });
        }
        if (fileRef.current) fileRef.current.value = '';
        carregar();
      }
    } finally {
      setUploading(false);
    }
  }

  async function setSlot(id: string, slot: string) {
    const res = await fetch('/api/arquivos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, slotPeriodo: slot || null }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || 'Erro ao atribuir slot.');
    else toast.success('Slot atualizado.');
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este arquivo e todos os seus casos?')) return;
    const res = await fetch(`/api/arquivos?id=${id}`, { method: 'DELETE' });
    if (!res.ok) toast.error('Erro ao excluir.');
    else toast.success('Arquivo excluído.');
    carregar();
  }

  async function recalcular() {
    setRecalculando(true);
    try {
      const res = await fetch('/api/recalculate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || 'Erro.');
      else if (data.semArquivo) toast('Nenhum arquivo no slot ATUAL.', { icon: 'ℹ️' });
      else toast.success(`${data.atualizados} caso(s) recalculado(s).`);
    } finally {
      setRecalculando(false);
    }
  }

  const ocupacao = new Map(arquivos.filter((a) => a.slotPeriodo).map((a) => [a.slotPeriodo, a]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#263578]">Upload de CSV</h1>

      {pendentes > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <strong>{pendentes} operadora(s) sem prazo definido.</strong> O cálculo de prazos
            depende disso.{' '}
            <Link href="/admin/prazos" className="underline font-medium">
              Definir prazos
            </Link>
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#F07F00] hover:bg-[#d96e00] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            <UploadCloud size={16} />
            {uploading ? 'Enviando...' : 'Enviar CSV'}
          </button>
          <button
            onClick={recalcular}
            disabled={recalculando}
            className="flex items-center gap-2 border border-[#263578] text-[#263578] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw size={16} className={recalculando ? 'animate-spin' : ''} />
            Recalcular prazos (ATUAL)
          </button>
        </div>
        <p className="text-xs text-[#888] mt-2">
          Limite de 4 arquivos. CSV em latin1, separado por vírgula. Operadoras novas são
          detectadas automaticamente.
        </p>
      </div>

      {/* Mapa de slots */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SLOTS.map((s) => {
          const occ = ocupacao.get(s);
          return (
            <div
              key={s}
              className={`rounded-xl border p-4 ${
                occ ? 'bg-white border-[#02B8BF]' : 'bg-[#F2F2F2] border-dashed border-gray-300'
              }`}
            >
              <div className="text-xs font-semibold text-[#263578]">{SLOT_LABEL[s]}</div>
              <div className="text-sm mt-1 truncate text-[#444]">
                {occ ? occ.nomeArquivo : 'vazio'}
              </div>
              {occ && <div className="text-xs text-gray-400">{occ.totalCasos} casos</div>}
            </div>
          );
        })}
      </div>

      {/* Lista de arquivos */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#263578] text-white px-5 py-3 font-semibold">Arquivos carregados</div>
        <div className="p-5 overflow-x-auto">
          {arquivos.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center">Nenhum arquivo.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#444] border-b">
                  <th className="py-2 px-3">Arquivo</th>
                  <th className="py-2 px-3">Casos</th>
                  <th className="py-2 px-3">Enviado em</th>
                  <th className="py-2 px-3">Slot</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {arquivos.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 px-3 max-w-[260px] truncate">{a.nomeArquivo}</td>
                    <td className="py-2 px-3">{a.totalCasos}</td>
                    <td className="py-2 px-3">
                      {new Date(a.dataUpload).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={a.slotPeriodo || ''}
                        onChange={(e) => setSlot(a.id, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm"
                      >
                        <option value="">— sem slot —</option>
                        {SLOTS.map((s) => (
                          <option key={s} value={s}>
                            {SLOT_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => excluir(a.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
