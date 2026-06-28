export function formatBRL(value: number): string {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatNumber(value: number): string {
  return (value || 0).toLocaleString('pt-BR');
}
