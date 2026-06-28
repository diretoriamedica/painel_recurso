import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export function canUpload(user: { isAdmin: boolean; canUpload: boolean }) {
  return user.isAdmin || user.canUpload;
}

export function canEditPrazos(user: {
  isAdmin: boolean;
  canEditPrazos: boolean;
}) {
  return user.isAdmin || user.canEditPrazos;
}

export function canRecalcular(user: {
  isAdmin: boolean;
  canUpload: boolean;
  canEditPrazos: boolean;
}) {
  return user.isAdmin || user.canUpload || user.canEditPrazos;
}
