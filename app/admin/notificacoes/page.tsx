'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import { Send, Mail } from 'lucide-react';

export default function NotificacoesPage() {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setResultado(null);
    try {
      const res = await apiFetch('/api/send-alerts', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao enviar.');
        setResultado(data.error || 'Erro ao enviar.');
      } else if (data.enviado) {
        const msg = `Enviado para ${data.destinatarios} destinatário(s) — ${data.casos} caso(s) urgente(s).`;
        toast.success(msg);
        setResultado(msg);
      } else {
        toast(data.reason || 'Nada a enviar.', { icon: 'ℹ️' });
        setResultado(data.reason || 'Nada a enviar.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-[#263578]">Notificações por E-mail</h1>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4 text-[#263578]">
          <Mail size={22} />
          <span className="font-semibold">Alerta de prazos próximos ao vencimento</span>
        </div>
        <ol className="list-decimal list-inside text-sm text-[#444] space-y-1 mb-5">
          <li>Seleciona os casos do slot ATUAL vencidos ou vencendo em até 5 dias.</li>
          <li>Monta um e-mail com a tabela dos casos urgentes.</li>
          <li>
            Envia (via Resend) a todos os usuários com “Recebe notificações” ativo e aprovados.
          </li>
        </ol>

        <button
          onClick={enviar}
          disabled={enviando}
          className="flex items-center gap-2 bg-[#F07F00] hover:bg-[#d96e00] text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          <Send size={16} />
          {enviando ? 'Enviando...' : 'Enviar alertas agora'}
        </button>

        {resultado && (
          <div className="mt-4 text-sm bg-[#F2F2F2] rounded-lg px-4 py-3 text-[#263578]">
            {resultado}
          </div>
        )}
      </div>
    </div>
  );
}
