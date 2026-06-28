import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    isAdmin: boolean;
    canUpload: boolean;
    canEditPrazos: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      isAdmin: boolean;
      canUpload: boolean;
      canEditPrazos: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isAdmin: boolean;
    canUpload: boolean;
    canEditPrazos: boolean;
  }
}
