'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setErro(
        res.error.includes('aprovação')
          ? res.error
          : 'E-mail ou senha inválidos.',
      );
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] px-4">
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
              width={190}
              height={123}
            />
          </div>
          <div className="text-sm text-[#444444]">
            Painel Recurso · Gestor de Glosas
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#263578] mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F07F00]"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F07F00] hover:bg-[#d96e00] text-white font-semibold rounded-lg py-2 transition disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-[#444444] mt-6">
          Não tem conta?{' '}
          <Link href="/signup" className="text-[#F07F00] font-medium">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
