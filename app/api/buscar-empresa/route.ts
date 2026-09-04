import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { sugerirEmailsEmpresa } from "../../../lib/enriquecimento";
import { runProvider } from "../../../lib/enrichment/engine";
import type { ContextoEnriquecimento } from "../../../lib/enrichment/types";

type EmpresaFicha = {
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  socio_nome: string | null;
  socio_cargo: string | null;
  endereco: string | null;
  telefone_empresa: string | null;
  telefones_empresa: string[];
  website: string | null;
  linkedin_url: string | null;
  emails_genericos: string[];
  fontes: string[];
  origem: "banco" | "web";
};

async function enriquecerFicha(
  ficha: EmpresaFicha,
  ctx?: ContextoEnriquecimento
): Promise<EmpresaFicha> {
  const nome = ficha.nome;

  // O adapter (enriquecerFicha) continua dono do MERGE por campo (first-match-wins),
  // das tags de fontes e do retorno EmpresaFicha. O engine.runProvider() é a
  // instrumentação de cada chamada (ledger/erro/custo — aqui sem custo).
  const pedido = {
    orgId: ctx?.organizacao_id ?? null,
    usuarioId: ctx?.usuario_id ?? null,
    tipo: "telefone" as const,
    alvo: { tipo: "empresa" as const, chave: nome, nomeEmpresa: nome },
  };

  // Casa dos Dados + Maps + Google (dados da empresa) — em PARALELO, igual ao legado.
  const [casa, maps, google] = await Promise.all([
    runProvider("casadosdados", pedido, ctx ?? {}),
    runProvider("maps", pedido, ctx ?? {}),
    runProvider("serper", { ...pedido, tipo: "website" as const }, ctx ?? {}),
  ]);

  const casaCad = casa.dados?.cadastrais ?? {};
  if (casaCad.cnpj && !ficha.cnpj) {
    ficha.cnpj = casaCad.cnpj as string;
    ficha.fontes.push("casa_dados");
  }
  if (casaCad.razao_social && !ficha.razao_social) {
    ficha.razao_social = casaCad.razao_social as string;
  }
  if (casaCad.nome_fantasia && !ficha.nome) {
    ficha.nome = casaCad.nome_fantasia as string;
  }
  const casaTel = casa.dados?.telefones?.[0]?.numero;
  if (casaTel && !ficha.telefone_empresa) {
    ficha.telefone_empresa = casaTel;
    ficha.fontes.push("casa_dados_tel");
  }

  const mapsTel = maps.dados?.telefones?.[0]?.numero;
  if (mapsTel && !ficha.telefone_empresa) {
    ficha.telefone_empresa = mapsTel;
    ficha.fontes.push("maps");
  }
  if (maps.dados?.website && !ficha.website) {
    ficha.website = maps.dados.website;
    ficha.fontes.push("maps_website");
  }

  if (google.dados?.website && !ficha.website) {
    ficha.website = google.dados.website;
    ficha.fontes.push("google");
  }
  if (google.dados?.linkedinEmpresa && !ficha.linkedin_url) {
    ficha.linkedin_url = google.dados.linkedinEmpresa;
    ficha.fontes.push("google_linkedin");
  }

  if (ficha.cnpj) {
    const brasil = await runProvider(
      "brasilapi",
      { ...pedido, alvo: { ...pedido.alvo, cnpj: ficha.cnpj } },
      ctx ?? {}
    );
    const brasilCad = brasil.dados?.cadastrais ?? {};
    if (brasilCad.razao_social && !ficha.razao_social) {
      ficha.razao_social = brasilCad.razao_social as string;
    }
    const brasilTel = brasil.dados?.telefones?.[0]?.numero;
    if (brasilTel && !ficha.telefone_empresa) {
      ficha.telefone_empresa = brasilTel;
      ficha.fontes.push("brasil_api");
    }
  }

  if (ficha.website) {
    const site = await runProvider(
      "site",
      { ...pedido, alvo: { ...pedido.alvo, website: ficha.website } },
      ctx ?? {}
    );
    const siteTels = (site.dados?.telefones ?? []).map((t) => t.numero);
    if (siteTels.length > 0) {
      ficha.telefones_empresa = [...new Set([...ficha.telefones_empresa, ...siteTels])];
      if (!ficha.telefone_empresa) ficha.telefone_empresa = siteTels[0];
      ficha.fontes.push("site");
    }
    const siteEmails = (site.dados?.emails ?? []).map((e) => e.email);
    if (siteEmails.length > 0) {
      ficha.emails_genericos = [...new Set([...siteEmails, ...ficha.emails_genericos])];
      ficha.fontes.push("site_email");
    }
  }

  // Sugestões de e-mail por domínio (sem tag de fonte, igual ao legado).
  if (ficha.website && ficha.emails_genericos.length === 0) {
    const dominio = ficha.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    const pat = await runProvider(
      "patterns",
      { ...pedido, tipo: "email" as const, alvo: { ...pedido.alvo, dominio } },
      ctx ?? {}
    );
    ficha.emails_genericos = (pat.dados?.emails ?? []).map((e) => e.email);
  }

  if (ficha.cnpj && ficha.emails_genericos.length === 0) {
    const dominioGerado = `${ficha.nome.toLowerCase().replace(/\s+/g, "")}.com.br`;
    const pat = await runProvider(
      "patterns",
      { ...pedido, tipo: "email" as const, alvo: { ...pedido.alvo, dominio: dominioGerado } },
      ctx ?? {}
    );
    ficha.emails_genericos = (pat.dados?.emails ?? []).map((e) => e.email);
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
      .select("id, nome_fantasia, razao_social, cnpj, endereco, telefone, website, campeao_linkedin, decisor_nome, decisor_cargo")
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
        socio_nome: e.decisor_nome ?? null,
        socio_cargo: e.decisor_cargo ?? null,
        endereco: e.endereco ?? null,
        telefone_empresa: e.telefone ?? null,
        telefones_empresa: e.telefone ? [e.telefone] : [],
        website: e.website ?? null,
        linkedin_url: (e as Record<string, unknown>).campeao_linkedin as string | null ?? null,
        emails_genericos: dominio ? sugerirEmailsEmpresa(dominio) : [],
        fontes: ["banco"],
        origem: "banco",
      };

      const enriquecida = await enriquecerFicha(ficha, {
        organizacao_id: orgId,
        usuario_id: userId,
      });
      return NextResponse.json({ empresa: enriquecida });
    }
  }

  const empresa: EmpresaFicha = {
    nome: q,
    cnpj: null,
    razao_social: null,
    socio_nome: null,
    socio_cargo: null,
    endereco: null,
    telefone_empresa: null,
    telefones_empresa: [],
    website: null,
    linkedin_url: null,
    emails_genericos: [],
    fontes: [],
    origem: "web",
  };

  const enriquecida = await enriquecerFicha(empresa, {
    organizacao_id: orgId,
    usuario_id: userId,
  });
  return NextResponse.json({ empresa: enriquecida });
}
