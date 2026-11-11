/**
 * Moldura única dos e-mails do FP Pipe, no visual do site: fundo claro,
 * tinta escura e cobalto. Feita com tabelas e estilos inline para
 * funcionar no Gmail, Outlook e Apple Mail.
 */

const TINTA = "#111114";
const SUAVE = "#4b4b53";
const APAGADO = "#8a8a92";
const COBALTO = "#2442e5";
const PAPEL = "#f4f3ef";
const LINHA = "#e3e1db";
const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Escapa texto vindo de usuários antes de entrar no HTML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function destaque(texto: string): string {
  return `<strong style="color:${TINTA};font-weight:600;">${texto}</strong>`;
}

export function paragrafo(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${SUAVE};">${html}</p>`;
}

/** Lista de pares rótulo/valor (ex.: Plano, Próxima cobrança). */
export function tabelaDados(linhas: Array<[string, string]>): string {
  const tr = linhas
    .map(
      ([rotulo, valor]) => `
      <tr>
        <td style="padding:10px 0;border-top:1px solid ${LINHA};font-size:13px;color:${APAGADO};width:160px;">${rotulo}</td>
        <td style="padding:10px 0;border-top:1px solid ${LINHA};font-size:14px;color:${TINTA};font-weight:500;">${valor}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-bottom:1px solid ${LINHA};">${tr}</table>`;
}

/** Lista simples com marcador cobalto. */
export function listaItens(itens: string[]): string {
  const tr = itens
    .map(
      (item) => `
      <tr>
        <td width="20" valign="top" style="padding:0 0 10px;font-size:14px;line-height:1.6;color:${COBALTO};">&#9650;</td>
        <td style="padding:0 0 10px;font-size:14px;line-height:1.6;color:${SUAVE};">${item}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${tr}</table>`;
}

export function layoutEmail({
  titulo,
  selo,
  corpo,
  cta,
  rodape,
  urlApp,
}: {
  titulo: string;
  selo?: string;
  corpo: string;
  cta?: { texto: string; url: string };
  rodape?: string;
  urlApp: string;
}): string {
  const botao = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
        <tr>
          <td style="border-radius:999px;background:${COBALTO};">
            <a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-family:${FONTE};font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:999px;">${cta.texto} &rarr;</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${PAPEL};font-family:${FONTE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPEL};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:0 4px 24px;">
              <span style="font-size:16px;font-weight:600;color:${TINTA};letter-spacing:-0.01em;"><span style="color:${COBALTO};">&#9650;</span>&nbsp;FP Pipe</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid ${LINHA};border-radius:16px;padding:36px 32px;">
              ${selo ? `<p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COBALTO};">${selo}</p>` : ""}
              <h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;font-weight:500;letter-spacing:-0.02em;color:${TINTA};">${titulo}</h1>
              ${corpo}
              ${botao}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 4px 0;font-size:12px;line-height:1.6;color:${APAGADO};">
              ${rodape ?? "Este e-mail foi enviado automaticamente pelo FP Pipe."}<br>
              <a href="${urlApp}" style="color:${APAGADO};text-decoration:underline;">fppipe.com.br</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
