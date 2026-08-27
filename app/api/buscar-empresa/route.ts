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

async function enriquecerFicha(ficha: EmpresaFicha): Promise<EmpresaFicha> {
  const nome = ficha.nome;

  const [casaResultado, mapsResultado] = await Promise.all([
    buscarCnpjPorEmpresa(nome),
    buscarTelefoneMaps(nome),
  ]);

  if (casaResultado.cnpj && !ficha.cnpj) {
    ficha.cnpj = casaResultado.cnpj;
    ficha.fontes.push("casa_dados");
  }

  if (casaResultado.razao_social && !ficha.razao_social) {
    ficha.razao_social = casaResultado.razao_social;
  }

  if (casaResultado.nome_fantasia && !ficha.nome) {
    ficha.nome = casaResultado.nome_fantasia;
  }

  if (casaResultado.telefone && !ficha.telefone_empresa) {
    ficha.telefone_empresa = casaResultado.telefone;
    ficha.fontes.push("casa_dados_tel");
  }

  if (ficha.cnpj) {
    const dadosBrasil = await buscarDadosCnpj(ficha.cnpj);
    if (dadosBrasil) {
      if (dadosBrasil.razaoSocial && !ficha.razao_social) {
        ficha.razao_social = dadosBrasil.razaoSocial;
      }
      if (dadosBrasil.telefone && !ficha.telefone_empresa) {
        ficha.telefone_empresa = dadosBrasil.telefone;
        ficha.fontes.push("brasil_api");
      }
    }
  }

  if (mapsResultado.telefone && !ficha.telefone_empresa) {
    ficha.telefone_empresa = mapsResultado.telefone;
    ficha.fontes.push("maps");
  }

  if (mapsResultado.website && !ficha.website) {
    ficha.website = mapsResultado.website;
    ficha.fontes.push("maps_website");
  }

  if (ficha.website && ficha.emails_genericos.length === 0) {
    const dominio = ficha.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    ficha.emails_genericos = sugerirEmailsEmpresa(dominio);
  }

  if (!ficha.website && ficha.emails_genericos.length === 0 && ficha.cnpj) {
    const dadosBrasil = await buscarDadosCnpj(ficha.cnpj);
    if (dadosBrasil?.telefone) {
      if (!ficha.telefone_empresa) {
        ficha.telefone_empresa = dadosBrasil.telefone;
        ficha.fontes.push("brasil_api_tel");
      }
    }
  }

  return ficha;
}

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

      const ficha: EmpresaFicha = {
        nome,
        cnpj: e.cnpj ?? null,
        razao_social: e.razao_social ?? null,
        endereco: e.endereco ?? null,
        telefone_empresa: e.telefone ?? null,
        website: e.website ?? null,
        emails_genericos: dominio ? sugerirEmailsEmpresa(dominio) : [],
        fontes: ["banco"],
        origem: "banco",
      };

      const enriquecida = await enriquecerFicha(ficha);
      return NextResponse.json({ empresa: enriquecida });
    }
  }

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

  const enriquecida = await enriquecerFicha(empresa);
  return NextResponse.json({ empresa: enriquecida });
}
