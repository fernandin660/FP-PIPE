import { NextResponse } from "next/server";
import { exigirRateLimit } from "../../../../lib/rate-limit";
import { registrarPedidoNoCrm } from "../../../../lib/studio-crm";

/**
 * Formulário de contato do site do estúdio (/fr, /en, /es).
 * Público (sem login): limitado por IP, com armadilha para robôs.
 * Cria o lead no CRM da FP Pipe e avisa o dono por e-mail
 * (com "responder para" = cliente).
 */

const DESTINO = process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";
const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";
const EMAIL_VALIDO = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function texto(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const bloqueio = await exigirRateLimit(request, "studio-contato", 3, 300);
  if (bloqueio) return bloqueio;

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "invalido" }, { status: 400 });
  }

  // Robô preencheu o campo escondido: finge sucesso e descarta.
  if (texto(corpo.site, 200)) return NextResponse.json({ ok: true });

  const nome = texto(corpo.nome, 200);
  const empresa = texto(corpo.empresa, 200);
  const email = texto(corpo.email, 200);
  const telefone = texto(corpo.telefone, 60);
  const mensagem = texto(corpo.mensagem, 3000);
  const idioma = ["pt", "fr", "en", "es"].includes(String(corpo.idioma)) ? String(corpo.idioma) : "fr";

  if (!nome || !mensagem || !EMAIL_VALIDO.test(email)) {
    return NextResponse.json({ erro: "campos" }, { status: 400 });
  }

  const linhas = [
    `Novo pedido pelo site do estúdio (${idioma.toUpperCase()})`,
    "",
    `Nome: ${nome}`,
    `Empresa: ${empresa || "-"}`,
    `E-mail: ${email}`,
    `Telefone: ${telefone || "-"}`,
    "",
    "Projeto:",
    mensagem,
  ];

  // Dois caminhos independentes: lead no CRM e aviso por e-mail.
  // O pedido só é dado como perdido se os DOIS falharem.
  const [crm, emailEnviado] = await Promise.all([
    registrarPedidoNoCrm({ nome, empresa, email, telefone, mensagem, idioma }).catch((e) => {
      console.error("Studio → CRM: erro inesperado:", e);
      return { ok: false as const };
    }),
    enviarEmail(linhas.join("\n"), email, `Site ${idioma.toUpperCase()} — novo pedido de ${nome}${empresa ? ` (${empresa})` : ""}`),
  ]);

  if (!crm.ok && !emailEnviado) {
    return NextResponse.json({ erro: "envio" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

async function enviarEmail(texto: string, responderPara: string, assunto: string): Promise<boolean> {
  if (!CHAVE_RESEND) {
    console.error("Studio contato: RESEND_API_KEY ausente.");
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE_RESEND}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FP Pipe Studio <avisos@fppipe.com.br>",
        to: [DESTINO],
        reply_to: responderPara,
        subject: assunto,
        text: texto,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.error("Studio contato: Resend respondeu", r.status);
    return r.ok;
  } catch {
    return false;
  }
}
