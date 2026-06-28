'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (form.password.length < 8 || form.password.length > 64) {
      setErro('A senha deve ter entre 8 e 64 caracteres.');
      return;
    }
    setLoading(true);
    const res = await apiFetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErro(data.error || 'Erro ao cadastrar.');
      return;
    }
    setSucesso(
      data.aprovado
        ? 'Conta criada e aprovada! Você já pode entrar.'
        : 'Conta criada! Aguarde a aprovação de um administrador para acessar.',
    );
    setForm({ name: '', email: '', phone: '', password: '' });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <a
          href="https://www.redehc.com.br"
          className="inline-flex items-center gap-1 text-sm text-[#263578] hover:text-[#F07F00] mb-4"
        >
          <ArrowLeft size={16} /> Voltar ao portal
        </a>

        <div className="flex flex-col items-center mb-6">
          <div className="bg-white rounded-xl p-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/painelrecurso/logo-rede-casa.png"
              alt="Rede Casa"
              width={170}
              height={110}
            />
          </div>
          <div className="text-sm text-[#444444]">
            Criar conta · Painel Recurso
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              Nome
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              Telefone (opcional)
            </label>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              Senha (8 a 64 caracteres)
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
            />
          </div>

          {erro && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F07F00] hover:bg-[#d96e00] text-white font-semibold rounded-lg py-2 transition disabled:opacity-60"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-sm text-[#444444] mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-[#F07F00] font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
