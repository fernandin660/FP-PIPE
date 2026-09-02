import { NextRequest, NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { registrarUso } from "../../../lib/avisos";
import { runProvider } from "../../../lib/enrichment/engine";

const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";

function digitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const supabase = await criarClienteSupabaseServidor();

  if (!supabase) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { erro: "Faça login novamente." },
      { status: 401 }
    );
  }

  if (!CHAVE_MAPS) {
    return NextResponse.json(
      {
        erro:
          "Google Maps não configurado: cadastre GOOGLE_MAPS_API_KEY na Vercel.",
      },
      { status: 400 }
    );
  }

  const corpo = (await req.json().catch(() => null)) as {
    companyId?: string;
  } | null;

  const companyId = String(corpo?.companyId ?? "").trim();
  if (!companyId) {
    return NextResponse.json({ erro: "Lead inválido." }, { status: 400 });
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select(
      "id, razao_social, nome_fantasia, municipio, uf, telefone, telefones_extra, emails_extra"
    )
    .eq("id", companyId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) {
    return NextResponse.json(
      { erro: "Lead não encontrado." },
      { status: 404 }
    );
  }

  // Já temos contato institucional salvo? Não queima a franquia do Google à toa.
  const extrasTelefone = (empresa.telefones_extra ?? []) as string[];
  const extrasEmail = (empresa.emails_extra ?? []) as string[];

  if (extrasTelefone.length > 0 || extrasEmail.length > 0) {
    return NextResponse.json({
      doCache: true,
      fonte: "cache",
      empresa: {
        email: null,
        telefone: (empresa.telefone ?? "").trim() || null,
        emails_extra: extrasEmail,
        telefones_extra: extrasTelefone,
      },
    });
  }

  const termo = [
    empresa.nome_fantasia || empresa.razao_social,
    empresa.municipio,
    empresa.uf,
  ]
    .filter(Boolean)
    .join(" ");

  void registrarUso("maps");

  // Chamada real ao Google Maps passa pelo Enrichment Engine (runProvider).
  // O provider "maps-search" espelha esta rota: 1º lugar com telefone,
  // displayName (fonteNome) e distinção 502 (recusado/erro).
  const resultado = await runProvider(
    "maps-search",
    {
      orgId: null,
      usuarioId: user.id,
      tipo: "telefone",
      alvo: {
        tipo: "empresa",
        chave: companyId,
        nomeEmpresa: empresa.nome_fantasia || empresa.razao_social || "",
        cidade: empresa.municipio || undefined,
        uf: empresa.uf || undefined,
      },
    },
    { organizacao_id: null, usuario_id: user.id }
  );

  if (!resultado.ok) {
    const codigo = resultado.erro?.codigo;
    return NextResponse.json(
      {
        erro:
          codigo === "recusado"
            ? "Google Maps recusou a consulta. Verifique a chave/billing."
            : "Não foi possível falar com o Google Maps agora.",
      },
      { status: 502 }
    );
  }

  const telefoneMaps = resultado.dados?.telefones?.[0]?.numero ?? null;

  if (!telefoneMaps) {
    return NextResponse.json(
      {
        erro:
          "Nenhum telefone público no Google Maps para esta empresa.",
        empresa: {
          email: null,
          telefone: empresa.telefone ?? null,
          emails_extra: [],
          telefones_extra: (empresa.telefones_extra ?? []) as string[],
        },
      },
      { status: 404 }
    );
  }

  // Soma fontes: nunca sobrescreve, só agrega o que ainda não existe.
  const atuais = (empresa.telefones_extra ?? []) as string[];
  const primario = (empresa.telefone ?? "").trim();

  const duplicado =
    (primario && digitos(primario) === digitos(telefoneMaps)) ||
    atuais.some((t) => digitos(t) === digitos(telefoneMaps));

  const novosExtras = duplicado ? atuais : [telefoneMaps, ...atuais];

  if (!duplicado) {
    await supabase
      .from("companies")
      .update({ telefones_extra: novosExtras })
      .eq("id", companyId);
  }

  return NextResponse.json({
    empresa: {
      email: null,
      telefone: primario || null,
      emails_extra: (empresa.emails_extra ?? []) as string[],
      telefones_extra: novosExtras,
    },
    fonte: resultado.dados?.fonteNome ?? "Google Maps",
  });
}
