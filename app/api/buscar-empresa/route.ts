import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import {
  buscarCnpjPorEmpresa,
  buscarTelefoneMaps,
  buscarDadosCnpj,
  sugerirEmailsEmpresa,
} from "../../../lib/enriquecimento";

type EmpresaFicha = {
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  endereco: string | null;
  telefone_empresa: string | null;
  website: string | null;
  emails_genericos: string[];
  fontes: string[];
  origem: "banco" | "web";
};

export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { erro: "Digite pelo menos 2 caracteres." },
      { status: 400 }
    );
  }

  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  // 1. Buscar no banco do usuário (companies)
  const { data: orgData } = await supabase
    .from("organizacao_membros")
    .select("organizacao_id")
    .eq("usuario_id", user.id)
    .single();

  if (orgData) {
    const termoLower = `%${q}%`;
    const { data: empresas } = await supabase
      .from("companies")
      .select("id, nome_fantasia, razao_social, cnpj, endereco, telefone, website")
      .eq("organizacao_id", orgData.organizacao_id)
      .or(`nome_fantasia.ilike.${termoLower},razao_social.ilike.${termoLower},cnpj.ilike.${termoLower}`)
      .order("nome_fantasia")
      .limit(1);

    if (empresas && empresas.length > 0) {
      const e = empresas[0];
      const nome = e.nome_fantasia || e.razao_social || q;
      const dominio = e.website
        ?.replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];

      return NextResponse.json({
        empresa: {
          nome,
          cnpj: e.cnpj ?? null,
          razao_social: e.razao_social ?? null,
          endereco: e.endereco ?? null,
          telefone_empresa: e.telefone ?? null,
          website: e.website ?? null,
          emails_genericos: dominio ? sugerirEmailsEmpresa(dominio) : [],
          fontes: ["banco"],
          origem: "banco" as const,
        },
      });
    }
  }

  // 2. Buscar na web (Casa dos Dados + Maps + Brasil API)
  const empresa: EmpresaFicha = {
    nome: q,
    cnpj: null,
    razao_social: null,
    endereco: null,
    telefone_empresa: null,
    website: null,
    emails_genericos: [],
    fontes: [],
    origem: "web",
  };

  // Busca paralela: Casa dos Dados + Maps
  const [casaResultado, mapsResultado] = await Promise.all([
    buscarCnpjPorEmpresa(q),
    buscarTelefoneMaps(q),
  ]);

  // Enriquecer com Casa dos Dados
  if (casaResultado.cnpj) {
    empresa.cnpj = casaResultado.cnpj;
    if (casaResultado.telefone) {
      empresa.telefone_empresa = casaResultado.telefone;
      empresa.fontes.push("casa_dados");
    }

    // Buscar dados completos via Brasil API
    const dadosBrasil = await buscarDadosCnpj(casaResultado.cnpj);
    if (dadosBrasil) {
      if (dadosBrasil.razaoSocial) empresa.razao_social = dadosBrasil.razaoSocial;
      if (dadosBrasil.telefone && !empresa.telefone_empresa) {
        empresa.telefone_empresa = dadosBrasil.telefone;
        empresa.fontes.push("brasil_api");
      }
    }
  }

  // Enriquecer com Google Maps
  if (mapsResultado.telefone && !empresa.telefone_empresa) {
    empresa.telefone_empresa = mapsResultado.telefone;
    empresa.fontes.push("maps");
  }
  if (mapsResultado.website) {
    empresa.website = mapsResultado.website;
    empresa.fontes.push("maps_website");
  }

  // Gerar emails genéricos
  if (empresa.website) {
    const dominio = empresa.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    empresa.emails_genericos = sugerirEmailsEmpresa(dominio);
  }

  return NextResponse.json({ empresa });
}
