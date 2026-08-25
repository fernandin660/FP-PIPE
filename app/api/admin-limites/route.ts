import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { LIMITES_MENSAIS } from "../../../lib/avisos";

const EMAIL_ADMIN =
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) {
    return gate.resposta;
  }

  const {
    data: { user },
  } = await gate.ctx!.supabase.auth.getUser();

  if ((user?.email ?? "").toLowerCase() !== EMAIL_ADMIN.toLowerCase()) {
    return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  let corpo: { api?: unknown; limite?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const api = typeof corpo.api === "string" ? corpo.api : "";
  if (!LIMITES_MENSAIS.hasOwnProperty(api)) {
    return NextResponse.json(
      { erro: "API desconhecida." },
      { status: 400 }
    );
  }

  const limite = Number(corpo.limite);
  if (!Number.isInteger(limite) || limite < 1 || limite > 1_000_000) {
    return NextResponse.json(
      { erro: "Limite deve ser um número inteiro entre 1 e 1.000.000." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("limites_apis")
    .upsert(
      { api, limite, atualizado_em: new Date().toISOString() },
      { onConflict: "api" }
    );

  if (error) {
    return NextResponse.json(
      { erro: "Não foi possível salvar. A tabela limites_apis existe? Rode o SQL supabase-limites-apis.sql." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, api, limite });
}
