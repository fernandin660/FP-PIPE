import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Anti-SSRF: decide se uma URL pública pode ser buscada pelo servidor.
 *
 * Bloqueia esquemas que não sejam http(s), portas fora de 80/443 e
 * qualquer host que RESOLVA para IP privado, loopback, link-local
 * (metadata da nuvem), CGNAT, multicast ou reservado — inclusive quando
 * o atacante usa um domínio próprio apontando para 127.0.0.1, IP em
 * formato decimal/hex ou IPv6 mapeado (::ffff:10.0.0.1).
 *
 * Use junto com `redirect: "manual"` no fetch (um redirect pode apontar
 * para a rede interna depois da checagem).
 */
export async function urlPublicaSegura(bruta: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return null;
  if (host.endsWith(".internal") || host.endsWith(".local")) return null;

  let enderecos: string[];
  if (net.isIP(host)) {
    enderecos = [host];
  } else {
    try {
      const r = await lookup(host, { all: true, verbatim: true });
      enderecos = r.map((x) => x.address);
    } catch {
      return null;
    }
  }
  if (enderecos.length === 0 || enderecos.some(ipBloqueado)) return null;
  return url;
}

export function ipBloqueado(ip: string): boolean {
  let alvo = ip.toLowerCase();
  const mapeado = alvo.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeado) alvo = mapeado[1];

  if (net.isIPv4(alvo)) {
    const [a, b] = alvo.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast e reservados
    );
  }
  if (net.isIPv6(alvo)) {
    return (
      alvo === "::" ||
      alvo === "::1" ||
      alvo.startsWith("fc") ||
      alvo.startsWith("fd") || // ULA
      alvo.startsWith("fe8") ||
      alvo.startsWith("fe9") ||
      alvo.startsWith("fea") ||
      alvo.startsWith("feb") || // link-local
      alvo.startsWith("ff") || // multicast
      alvo.startsWith("::ffff:") ||
      alvo.startsWith("64:ff9b:")
    );
  }
  return true;
}
