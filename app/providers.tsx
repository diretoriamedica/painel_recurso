'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/painelrecurso/api/auth">
      {children}
      <Toaster position="top-right" />
    </SessionProvider>
  );
}
