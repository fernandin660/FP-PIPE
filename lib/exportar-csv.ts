export function baixarCsv(
  nomeArquivo: string,
  cabecalho: string[],
  linhas: unknown[][]
): void {
  const csv =
    "\uFEFF" +
    [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((celula) => `"${String(celula ?? "").replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
