'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const u = session?.user;

  const links = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/admin/upload', label: 'Upload', show: !!(u?.isAdmin || u?.canUpload) },
    { href: '/admin/prazos', label: 'Prazos', show: !!(u?.isAdmin || u?.canEditPrazos) },
    { href: '/admin/usuarios', label: 'Usuários', show: !!u?.isAdmin },
    { href: '/admin/notificacoes', label: 'Notificações', show: !!u?.isAdmin },
  ].filter((l) => l.show);

  return (
    <header className="bg-[#263578] text-white sticky top-0 z-30 shadow">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          <span className="bg-white rounded-md px-2 py-1 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/painelrecurso/logo-rede-casa.png"
              alt="Rede Casa"
              width={43}
              height={28}
            />
          </span>
          <span className="font-bold tracking-tight">Painel Recurso</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  active
                    ? 'bg-[#F07F00] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={() => signOut({ callbackUrl: '/painelrecurso/login' })}
            className="ml-2 flex items-center gap-1 text-white/70 hover:text-white text-sm px-2 py-1.5"
          >
            <LogOut size={16} /> Sair
          </button>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-white/10 px-4 py-2 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === l.href ? 'bg-[#F07F00]' : 'text-white/80'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: '/painelrecurso/login' })}
            className="flex items-center gap-1 text-white/80 text-sm px-3 py-2"
          >
            <LogOut size={16} /> Sair
          </button>
        </nav>
      )}
    </header>
  );
}
