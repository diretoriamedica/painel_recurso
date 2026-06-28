'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { Check, X, Trash2, UserPlus } from 'lucide-react';

const PERMS: { key: string; label: string }[] = [
  { key: 'isAdmin', label: 'Admin' },
  { key: 'canUpload', label: 'Upload' },
  { key: 'canEditPrazos', label: 'Prazos' },
  { key: 'recebeNotificacoes', label: 'Notif.' },
  { key: 'aprovado', label: 'Aprovado' },
];

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [novo, setNovo] = useState<any>({
    name: '',
    email: '',
    password: '',
    isAdmin: false,
    canUpload: false,
    canEditPrazos: false,
    recebeNotificacoes: false,
    aprovado: true,
  });

  async function carregar() {
    setLoading(true);
    const d = await fetch('/api/usuarios').then((r) => r.json());
    setUsuarios(d.usuarios || []);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function toggle(u: any, key: string) {
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, [key]: !u[key] }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || 'Erro.');
    else carregar();
  }

  async function excluir(u: any) {
    if (!confirm(`Excluir ${u.name}?`)) return;
    const res = await fetch(`/api/usuarios?id=${u.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(data.error || 'Erro.');
    else {
      toast.success('Usuário excluído.');
      carregar();
    }
  }

  async function criar() {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novo),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Erro ao criar.');
      return;
    }
    toast.success('Usuário criado.');
    setModal(false);
    setNovo({
      name: '',
      email: '',
      password: '',
      isAdmin: false,
      canUpload: false,
      canEditPrazos: false,
      recebeNotificacoes: false,
      aprovado: true,
    });
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#263578]">Usuários</h1>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-[#F07F00] hover:bg-[#d96e00] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <UserPlus size={16} /> Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-5 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="spinner w-8 h-8" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#444] border-b">
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3">E-mail</th>
                  {PERMS.map((p) => (
                    <th key={p.key} className="py-2 px-3 text-center">
                      {p.label}
                    </th>
                  ))}
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      {u.name}
                      {u.id === session?.user?.id && (
                        <span className="ml-1 text-xs text-gray-400">(você)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[#444]">{u.email}</td>
                    {PERMS.map((p) => (
                      <td key={p.key} className="py-2 px-3 text-center">
                        <button
                          onClick={() => toggle(u, p.key)}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            u[p.key]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {u[p.key] ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    ))}
                    <td className="py-2 px-3 text-right">
                      {u.id !== session?.user?.id && (
                        <button
                          onClick={() => excluir(u)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#263578]">Novo usuário</h2>
            <input
              placeholder="Nome"
              value={novo.name}
              onChange={(e) => setNovo({ ...novo, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="E-mail"
              type="email"
              value={novo.email}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Senha (mín. 8)"
              type="password"
              value={novo.password}
              onChange={(e) => setNovo({ ...novo, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {PERMS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!novo[p.key]}
                    onChange={(e) => setNovo({ ...novo, [p.key]: e.target.checked })}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 text-sm rounded-lg border"
              >
                Cancelar
              </button>
              <button
                onClick={criar}
                className="px-4 py-2 text-sm rounded-lg bg-[#F07F00] text-white font-medium"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
