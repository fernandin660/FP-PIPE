import { NextRequest, NextResponse } from "next/server";

import {
  criarClienteSupabaseServidor,
} from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";

const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";

const URL_CASADOSDADOS =
  "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa";
const URL_BRASILAPI = "https://brasilapi.com.br/api/cnpj/v1";
const URL_MINHARECEITA = "https://minhareceita.org";

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function digitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

type RespostaCasadosDados = {
  cnpjs?: Array<{
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
  }>;
};

type DadosBrasilApi = {
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
  descricao_tipo_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ddd_telefone_1?: string | number;
};

type DadosMinhaReceita = {
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
};

type RespostaPlaces = {
  places?: Array<{
    internationalPhoneNumber?: string;
    formattedPhoneNumber?: string;
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

  const corpo = (await req.json().catch(() => null)) as {
    nome?: string;
    cargo?: string;
    empresa?: string;
    email?: string;
    linkedinUrl?: string;
    cidade?: string;
    uf?: string;
    listaId?: string;
    novaListaNome?: string;
  } | null;

  const nomePessoa = (corpo?.nome ?? "").trim() || null;
  const cargoPessoa = (corpo?.cargo ?? "").trim() || null;
  const emailPessoa = (corpo?.email ?? "").trim() || null;
  const empresaNome = (corpo?.empresa ?? "").trim();
  const linkedinUrl = (corpo?.linkedinUrl ?? "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
  const cidadeInput = (corpo?.cidade ?? "").trim();
  const ufInput = (corpo?.uf ?? "").trim().toUpperCase().slice(0, 2);

  if (!emailPessoa && !nomePessoa) {
    return NextResponse.json(
      { erro: "Sem dados suficientes para cadastrar o lead." },
      { status: 400 }
    );
  }

  // 1) Encontra o CNPJ da empresa pelo nome (Casa dos Dados)
  let cnpjEscolhido: string | null = null;

  if (empresaNome) {
    try {
      const corpoBusca: Record<string, unknown> = {
        nome_empresa: [semAcento(empresaNome)],
        situacao_cadastral: ["ATIVA"],
        limite: 10,
      };

      if (ufInput) corpoBusca.uf = [ufInput];

      const resposta = await fetch(URL_CASADOSDADOS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        },
        body: JSON.stringify(corpoBusca),
        signal: AbortSignal.timeout(20000),
      });

      if (resposta.ok) {
        const dados = (await resposta.json()) as RespostaCasadosDados;
        const lista = dados.cnpjs ?? [];

        if (lista.length > 0) {
          const tokens = semAcento(empresaNome)
            .split(/\s+/)
            .filter((t) => t.length > 2);

          const pontuar = (item: { razao_social?: string; nome_fantasia?: string }): number => {
            const alvo = semAcento(
              `${item.razao_social ?? ""} ${item.nome_fantasia ?? ""}`
            );
            return tokens.filter((t) => alvo.includes(t)).length;
          };

          const ordenada = [...lista].sort(
            (a, b) => pontuar(b) - pontuar(a)
          );

          cnpjEscolhido = digitos(ordenada[0]?.cnpj ?? "") || null;
        }
      }
    } catch {
      // Busca falhou — segue como lead simples
    }
  }

  // 2) Enriquece o CNPJ encontrado (Receita + Maps)
  let razaoSocial = "";
  let nomeFantasia = empresaNome;
  let municipio = cidadeInput;
  let ufLocal = ufInput;
  let endereco = "";
  let telefonePrincipal: string | null = null;
  const emailsExtra: string[] = [];
  const telefonesExtra: string[] = [];

  if (cnpjEscolhido) {
    try {
      const respostaBrasilApi = await fetch(
        `${URL_BRASILAPI}/${cnpjEscolhido}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (respostaBrasilApi.ok) {
        const d = (await respostaBrasilApi.json()) as DadosBrasilApi;

        if (d.razao_social) razaoSocial = d.razao_social;
        if (d.nome_fantasia) nomeFantasia = d.nome_fantasia;
        if (d.municipio) municipio = d.municipio;
        if (d.uf) ufLocal = d.uf;

        endereco = [
          d.descricao_tipo_logradouro,
          d.logradouro,
          d.numero,
          d.complemento,
        ]
          .filter(Boolean)
          .join(" ");

        if (d.bairro) endereco += ` - ${d.bairro}`;

        const tel = d.ddd_telefone_1
          ? String(d.ddd_telefone_1)
          : null;

        if (tel && digitos(tel).length >= 8) telefonePrincipal = tel;
      }
    } catch {
      // segue
    }

    try {
      const respostaReceita = await fetch(
        `${URL_MINHARECEITA}/${cnpjEscolhido}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (respostaReceita.ok) {
        const d = (await respostaReceita.json()) as DadosMinhaReceita;

        if (d.email && d.email.includes("@")) {
          emailsExtra.push(d.email.trim());
        }

        for (const t of [d.ddd_telefone_1, d.ddd_telefone_2]) {
          if (
            typeof t === "string" &&
            digitos(t).length >= 8 &&
            !telefonesExtra.some(
              (x) => digitos(x) === digitos(t as string)
            )
          ) {
            telefonesExtra.push(t);
          }
        }
      }
    } catch {
      // segue
    }

    if (CHAVE_MAPS) {
      try {
        const termo = [
          nomeFantasia || razaoSocial,
          municipio,
          ufLocal,
        ]
          .filter(Boolean)
          .join(" ");

        const respostaMaps = await fetch(
          "https://places.googleapis.com/v1/places:searchText",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": CHAVE_MAPS,
              "X-Goog-FieldMask":
                "places.internationalPhoneNumber,places.formattedPhoneNumber",
            },
            body: JSON.stringify({
              textQuery: termo,
              languageCode: "pt-BR",
              regionCode: "BR",
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (respostaMaps.ok) {
          const d = (await respostaMaps.json()) as RespostaPlaces;

          const lugar = (d.places ?? []).find(
            (p) =>
              p.internationalPhoneNumber ||
              p.formattedPhoneNumber
          );

          const telMaps =
            lugar?.internationalPhoneNumber ??
            lugar?.formattedPhoneNumber ??
            null;

          if (
            telMaps &&
            !telefonesExtra.some(
              (x) => digitos(x) === digitos(telMaps)
            )
          ) {
            telefonesExtra.push(telMaps);
          }
        }
      } catch {
        // segue
      }
    }
  }

  // 3) Cria o lead
  const insercao: Record<string, unknown> = {
    usuario_id: user.id,
    origem: "buscador",
    confirmado: false,
    campeao_nome: nomePessoa,
    campeao_cargo: cargoPessoa,
    campeao_email: emailPessoa,
    campeao_linkedin: linkedinUrl || null,
  };

  if (cnpjEscolhido) {
    insercao.cnpj = cnpjEscolhido;
    insercao.razao_social = razaoSocial || null;
    insercao.nome_fantasia = nomeFantasia || null;
    insercao.municipio = municipio || null;
    insercao.uf = ufLocal || null;
    insercao.endereco = endereco || null;
    insercao.telefone = telefonePrincipal;
    insercao.email = emailsExtra[0] ?? null;
    insercao.emails_extra = emailsExtra.slice(1);
    insercao.telefones_extra = telefonesExtra;
  } else {
    insercao.nome_fantasia = empresaNome || null;
  }

  const { data: leadCriado, error: erroInsert } = await supabase
    .from("companies")
    .insert(insercao)
    .select("id")
    .single();

  if (erroInsert || !leadCriado) {
    return NextResponse.json(
      { erro: "Não foi possível criar o lead." },
      { status: 500 }
    );
  }

  // 4) Registra o contato no dossiê do lead + cache global
  await supabase.from("contatos").insert({
    usuario_id: user.id,
    company_id: leadCriado.id,
    nome: nomePessoa,
    cargo: cargoPessoa,
    empresa: empresaNome || null,
    email: emailPessoa,
    emails: emailPessoa ? [emailPessoa] : [],
    telefones: [],
    linkedin_url: linkedinUrl || null,
    origem: "buscador",
  });

  if (linkedinUrl && emailPessoa) {
    const admin = criarClienteSupabaseAdmin();

    if (admin) {
      await admin.from("emails_cache").upsert(
        {
          linkedin_url: linkedinUrl,
          email: emailPessoa,
          nome: nomePessoa,
          cargo: cargoPessoa,
          empresa: empresaNome || null,
        },
        { onConflict: "linkedin_url" }
      );
    }
  }

  // 5) Encaixa o lead na lista escolhida (existente ou nova)
  let listaFinalId =
    typeof corpo?.listaId === "string" && corpo.listaId.trim()
      ? corpo.listaId.trim()
      : null;

  let listaFinalNome: string | null = null;

  const novaListaNome = (corpo?.novaListaNome ?? "").trim();

  if (!listaFinalId && novaListaNome) {
    const { data: listaCriada } = await supabase
      .from("listas")
      .insert({ usuario_id: user.id, nome: novaListaNome })
      .select("id, nome")
      .single();

    if (listaCriada) {
      listaFinalId = listaCriada.id;
      listaFinalNome = listaCriada.nome;
    }
  } else if (listaFinalId) {
    const { data: listaExistente } = await supabase
      .from("listas")
      .select("nome")
      .eq("id", listaFinalId)
      .maybeSingle();

    listaFinalNome = listaExistente?.nome ?? null;
  }

  if (listaFinalId) {
    await supabase
      .from("lista_empresas")
      .insert({ lista_id: listaFinalId, company_id: leadCriado.id });
  }

  return NextResponse.json({
    ok: true,
    leadId: leadCriado.id,
    comCnpj: Boolean(cnpjEscolhido),
    razaoSocial,
    nomeFantasia,
    municipio,
    uf: ufLocal,
    listaNome: listaFinalNome,
  });
}
