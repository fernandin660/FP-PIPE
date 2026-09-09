export function sanitizarBusca(termo: string): string {
  return termo
    .replace(/[%,()"'`;=|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
