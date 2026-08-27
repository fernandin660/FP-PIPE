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

async function enriquecerFicha(ficha: EmpresaFicha): Promise<EmpresaFicha & { _debug?: Record<string, unknown> }> {
  const nome = ficha.nome;
  const debug: Record<string, unknown> = {};

  const t0 = Date.now();
  const [casaResultado, mapsResultado] = await Promise.all([
    buscarCnpjPorEmpresa(nome).catch((e) => ({ erro: String(e) } as Awaited<ReturnType<typeof buscarCnpjPorEmpresa>>)),
    buscarTelefoneMaps(nome).catch((e) => ({ erro: String(e) } as Awaited<ReturnType<typeof buscarTelefoneMaps>>)),
  ]);
  debug.fontes1_ms = Date.now() - t0;
  debug.casa = { cnpj: casaResultado.cnpj, tel: casaResultado.telefone, razao: casaResultado.razao_social };
  debug.maps = { tel: mapsResultado.telefone, website: mapsResultado.website };

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

  if (mapsResultado.telefone && !ficha.telefone_empresa) {
    ficha.telefone_empresa = mapsResultado.telefone;
    ficha.fontes.push("maps");
  }

  if (mapsResultado.website && !ficha.website) {
    ficha.website = mapsResultado.website;
    ficha.fontes.push("maps_website");
  }

  if (ficha.cnpj) {
    const t1 = Date.now();
    const dadosBrasil = await buscarDadosCnpj(ficha.cnpj).catch((e) => {
      debug.brasil_err = String(e);
      return null;
    });
    debug.brasil_ms = Date.now() - t1;
    debug.brasil = dadosBrasil ? { tel: dadosBrasil.telefone, tel2: dadosBrasil.telefone2, razao: dadosBrasil.razaoSocial, email: dadosBrasil.email } : null;
    if (dadosBrasil?.razaoSocial && !ficha.razao_social) {
      ficha.razao_social = dadosBrasil.razaoSocial;
    }
    if (dadosBrasil?.telefone && !ficha.telefone_empresa) {
      ficha.telefone_empresa = dadosBrasil.telefone;
      ficha.fontes.push("brasil_api");
    }
    if (dadosBrasil?.telefone2 && !ficha.telefone_empresa) {
      ficha.telefone_empresa = dadosBrasil.telefone2;
      ficha.fontes.push("brasil_api_tel2");
    }
  }

  if (ficha.website && ficha.emails_genericos.length === 0) {
    const dominio = ficha.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    ficha.emails_genericos = sugerirEmailsEmpresa(dominio);
  }

  if (ficha.cnpj && ficha.emails_genericos.length === 0) {
    ficha.emails_genericos = sugerirEmailsEmpresa(`${ficha.nome.toLowerCase().replace(/\s+/g, "")}.com.br`);
  }

  (ficha as Record<string, unknown>)._debug = debug;
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
  let userId: string | null = null;
  let orgId: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      const { data: orgData } = await supabase
        .from("organizacao_membros")
        .select("organizacao_id")
        .eq("usuario_id", user.id)
        .single();

      if (orgData) {
        orgId = orgData.organizacao_id;
      }
    }
  }

  if (supabase && orgId) {
    const termoLower = `%${q}%`;
    const { data: empresas } = await supabase
      .from("companies")
      .select("id, nome_fantasia, razao_social, cnpj, endereco, telefone, website")
      .eq("organizacao_id", orgId)
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

  const debug = url.searchParams.get("debug") === "1";

  if (debug) {
    const t0 = Date.now();
    const enriquecida = await enriquecerFicha(empresa);
    const elapsed = Date.now() - t0;
    return NextResponse.json({ empresa: enriquecida, _debug: { elapsed } });
  }

  const enriquecida = await enriquecerFicha(empresa);
  return NextResponse.json({ empresa: enriquecida });
}
