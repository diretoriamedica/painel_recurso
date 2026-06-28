// Helper de fetch que respeita o basePath.
// O Next.js NÃO aplica o basePath em chamadas fetch() (só em <Link>, router e next/image),
// então no cliente precisamos prefixar manualmente as rotas /api.
export const BASE_PATH = '/painelrecurso';

export function apiFetch(path: string, init?: RequestInit) {
  const url = path.startsWith('/') ? `${BASE_PATH}${path}` : path;
  return fetch(url, init);
}
