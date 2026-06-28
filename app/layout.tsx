import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Painel Recurso — Gestor de Glosas | Rede Hospital Casa',
  description:
    'Gestão de glosas: prazos de recurso, semáforo de urgência e acompanhamento semanal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
