import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { emailValido } from "../../../lib/emails";

const MAX_BYTES_HTML = 300 * 1024;
const DOMINIOS_LIXO = [
  "sentry.io",
  "sentry-next.wixpress.com",
  "example.com",
  "example.org",
  "domain.com",
  "email.com",
  "yourdomain",
  "wixpress.com",
  "parastorage.com",
  "cloudflare",
  "godaddy.com",
  "squarespace.com",
  "shopify.com",
];
const EXTENSOES_LIXO = /\.(png|jpe?g|gif|webp|svg|css|js|pdf|ico)$/i;

function urlPermitida(bruto: string): URL | null {
  let alvo: URL;
  try {
    alvo = new URL(bruto);
  } catch {
    return null;
  }
  if (alvo.protocol !== "https:" && alvo.protocol !== "http:") return null;

  const host = alvo.hostname.toLowerCase();
  const hostBloqueado =
    ["localhost", "0.0.0.0", "169.254.169.254", "metadata.google.internal"].includes(
      host
    ) ||
    host === "::1" ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (hostBloqueado) return null;

  return alvo;
}

function extrairEmails(html: string, hostSite: string): string[] {
  const limpo = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const encontrados = new Set<string>();
  const regex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  for (const bruto of limpo.match(regex) ?? []) {
    const email = bruto.toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, "");
    const dominio = email.split("@")[1] ?? "";
    if (!dominio || dominio.includes("..")) continue;
    if (EXTENSOES_LIXO.test(dominio)) continue;
    if (DOMINIOS_LIXO.some((lixo) => dominio.includes(lixo))) continue;
    if (/^\d+\./.test(dominio) && /\d+\.\d+\.\d+\.\d+/.test(dominio)) continue;
    encontrados.add(email);
  }

  const lista = Array.from(encontrados);
  const hostSemWww = hostSite.replace(/^www\./, "");
  const doMesmoDominio = lista.filter((e) =>
    (e.split("@")[1] ?? "").includes(hostSemWww)
  );
  const genericosBoas = ["contato", "contact", "info", "vendas", "sales", "comercial", "hello", "oi"];
  const ordenados = [
    ...doMesmoDominio.filter((e) =>
      genericosBoas.some((g) => e.startsWith(g))
    ),
    ...doMesmoDominio.filter(
      (e) => !genericosBoas.some((g) => e.startsWith(g))
    ),
    ...lista.filter((e) => !doMesmoDominio.includes(e)),
  ];
  return Array.from(new Set(ordenados));
}

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, usuarioId, acesso } = gate.ctx!;

    // Raspagem de site faz parte dos planos Internacionais.
    if (!acesso.def.internacional) {
      return NextResponse.json(
        {
          erro:
            "A busca de e-mail pelo site faz parte dos planos 🌎 Internacionais.",
          motivo: "plano_nacional",
        },
        { status: 403 }
      );
    }

    const corpo = await request.json();
    const cnpj =
      typeof corpo.cnpj === "string"
        ? corpo.cnpj.replace(/\D/g, "")
        : "";
    const siteBruto = typeof corpo.site === "string" ? corpo.site.trim() : "";

    if (cnpj.length !== 14 || !siteBruto) {
      return NextResponse.json(
        { erro: "Empresa sem site para pesquisar." },
        { status: 400 }
      );
    }

    // Anti-SSRF: só http(s) público, nunca rede interna/metadata.
    const alvo = siteBruto.startsWith("http")
      ? urlPermitida(siteBruto)
      : urlPermitida(`https://${siteBruto}`);
    if (!alvo) {
      return NextResponse.json(
        { erro: "Site inválido ou não permitido." },
        { status: 400 }
      );
    }

    const resposta = await fetch(alvo.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!resposta.ok) {
      return NextResponse.json(
        { erro: "Não conseguimos abrir o site da empresa." },
        { status: 404 }
      );
    }

    const tipoConteudo = resposta.headers.get("content-type") ?? "";
    if (!tipoConteudo.includes("html") && !tipoConteudo.includes("text")) {
      return NextResponse.json(
        { erro: "O site não retornou uma página legível." },
        { status: 404 }
      );
    }

    const buffer = await resposta.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES_HTML) {
      return NextResponse.json(
        { erro: "Página muito grande para analisar." },
        { status: 404 }
      );
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const emails = extrairEmails(html, alvo.hostname);
    const emailValidoFinal = emailValido(emails[0]) ? emails[0] : null;

    if (!emailValidoFinal) {
      return NextResponse.json(
        {
          erro:
            "Não achamos nenhum e-mail público válido na página inicial desse site.",
          motivo: "sem_email",
        },
        { status: 404 }
      );
    }

    // Persiste o melhor e-mail na ficha da empresa (linha é do usuário).
    await supabase
      .from("companies")
      .update({ email: emailValidoFinal, atualizado_em: new Date().toISOString() })
      .eq("usuario_id", usuarioId)
      .eq("cnpj", cnpj);

    return NextResponse.json({ email: emailValidoFinal, extras: emails.slice(1, 4) });
  } catch {
    return NextResponse.json(
      { erro: "Não conseguimos analisar o site agora." },
      { status: 500 }
    );
  }
}
