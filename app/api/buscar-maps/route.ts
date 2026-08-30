import { NextRequest, NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { registrarUso } from "../../../lib/avisos";

const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";

function digitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

type RespostaPlaces = {
  places?: Array<{
    displayName?: { text?: string };
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
  }>;
};

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

  let resposta: Response;

  void registrarUso("maps");

  try {
    resposta = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": CHAVE_MAPS,
          "X-Goog-FieldMask":
            "places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber",
        },
        body: JSON.stringify({
          textQuery: termo,
          languageCode: "pt-BR",
          regionCode: "BR",
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com o Google Maps agora." },
      { status: 502 }
    );
  }

  if (!resposta.ok) {
    return NextResponse.json(
      { erro: "Google Maps recusou a consulta. Verifique a chave/billing." },
      { status: 502 }
    );
  }

  const dados = (await resposta.json()) as RespostaPlaces;

  const lugar = (dados.places ?? []).find(
    (p) =>
      typeof p.internationalPhoneNumber === "string" ||
      typeof p.nationalPhoneNumber === "string"
  );

  const telefoneMaps =
    lugar?.internationalPhoneNumber ?? lugar?.nationalPhoneNumber ?? null;

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
    fonte: lugar?.displayName?.text || "Google Maps",
  });
}
