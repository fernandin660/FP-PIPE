import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST(requisicao: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, usuarioId } = gate.ctx!;

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const dados = (corpo ?? {}) as Record<string, unknown>;

  const texto = (v: unknown, max = 300): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, max);
    return t || null;
  };

  // Só capturamos contatos que tenham LinkedIn — é a chave do cache global.
  const bruto = texto(dados.linkedin_url, 400);
  let linkedinUrl: string | null = null;

  if (bruto) {
    try {
      const url = new URL(bruto.startsWith("http") ? bruto : `https://${bruto}`);
      const hostOk = url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");

      if (hostOk) {
        const partes = url.pathname.split("/").filter(Boolean);
        if (partes[0] === "in" && partes[1]) {
          linkedinUrl = `https://www.linkedin.com/in/${partes[1]
            .replace(/[^\w\-%.]/g, "")
            .toLowerCase()}`;
        }
      }
    } catch {
      linkedinUrl = null;
    }
  }

  if (!linkedinUrl) {
    return NextResponse.json({ ok: true, capturado: false });
  }

  const emailBruto = texto(dados.email, 200);
  const email =
    emailBruto && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBruto)
      ? emailBruto.toLowerCase()
      : null;

  if (!email) {
    return NextResponse.json({ ok: true, capturado: false });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select("departamento_uso")
    .eq("id", usuarioId)
    .maybeSingle();

  const departamentoUso =
    (perfil?.departamento_uso as string | null)?.trim() || "";

  await admin.from("emails_cache").upsert(
    {
      linkedin_url: linkedinUrl,
      email,
      nome: texto(dados.nome, 200),
      cargo: texto(dados.cargo, 200),
      empresa: texto(dados.empresa, 200),
      departamento_uso: departamentoUso,
    },
    { onConflict: "linkedin_url" }
  );

  return NextResponse.json({ ok: true, capturado: true });
}
