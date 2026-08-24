import { NextResponse } from "next/server";
import {
  conhecimentoCnae,
  normalizarTextoLocal,
  formatarCnpj,
} from "@/lib/conhecimento-cnae";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { avaliarAcesso, mesAtual } from "../../../lib/planos";
import { registrarUso } from "../../../lib/avisos";

const URL_CASADOSDADOS =
  "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa";
const LIMITE_POR_RECORTE = 20;
const MAX_CHAMADAS = 12;
const LIMITE_TOTAL_EMPRESAS = 50;

const MAPA_PORTE: Record<string, string[]> = {
  Pequena: ["01", "03"],
  "Média": ["05"],
  Grande: ["05"],
};

// Segmentos onde empresas imobiliárias são o alvo legítimo da busca.
// Nos demais, nomes com esses termos são holdings de terras/imóveis
// (ex.: fazenda registrada como "Gestão Imobiliária") e devem ser excluídos.
const SEGMENTOS_IMOBILIARIOS = new Set(["Imobiliário", "Construção Civil"]);
const TERMOS_EXCLUSAO_NOME = [
  "IMOBILIARIA",
  "INCORPORADORA",
  "LOTEADORA",
  "EMPREENDIMENTOS IMOBILIARIOS",
];

function nomePareceImobiliario(nome: string): boolean {
  const nomeNormalizado = normalizarTextoLocal(nome);
  return TERMOS_EXCLUSAO_NOME.some((termo) =>
    nomeNormalizado.includes(termo)
  );
}

function mapearPortesParaCodigos(portes: string[]): string[] {
  const codigos = new Set<string>();
  for (const porte of portes) {
    for (const codigo of MAPA_PORTE[porte] ?? []) {
      codigos.add(codigo);
    }
  }
  return Array.from(codigos);
}

function chaveSemAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const mapaCnae = new Map<string, string[]>(
  Object.entries(conhecimentoCnae).map(([chave, codigos]) => [
    chaveSemAcento(chave),
    codigos,
  ])
);

type EmpresaEncontrada = {
  cnpj: string;
  cnpjFormatado: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  dataSituacao: string;
  segmentoIcp: string;
  uf: string;
  municipio: string;
};

type RespostaCasadosDados = {
  total?: number;
  cnpjs?: Array<{
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
    situacao_cadastral?: {
      situacao_atual?: string;
      motivo?: string;
      data?: string;
    };
  }>;
};

async function pesquisarRecorte(
  codigosCnae: string[],
  uf?: string,
  municipios: string[] = [],
  codigosPorte: string[] = []
): Promise<RespostaCasadosDados | null> {
  const corpo: Record<string, unknown> = {
    codigo_atividade_principal: codigosCnae,
    situacao_cadastral: ["ATIVA"],
    limite: LIMITE_POR_RECORTE,
  };
  if (uf) corpo.uf = [uf];
  if (municipios.length > 0) corpo.municipio = municipios.slice(0, 4);
  if (codigosPorte.length > 0) {
    corpo.porte_empresa = { codigos: codigosPorte };
  }

  const resposta = await fetch(URL_CASADOSDADOS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(20000),
  });

  if (!resposta.ok) return null;
  return (await resposta.json()) as RespostaCasadosDados;
}

export async function POST(request: Request) {
  try {
    const supabase = await criarClienteSupabaseServidor();
    if (!supabase) {
      return NextResponse.json(
        { erro: "Autenticação não configurada." },
        { status: 503 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { erro: "Faça login para gerar listas.", motivo: "sem_login" },
        { status: 401 }
      );
    }

    const acesso = await avaliarAcesso(supabase, user.id);
    if (acesso.expirada) {
      return NextResponse.json(
        {
          erro:
            "Seu plano expirou. Assine ou renove em /planos para continuar gerando listas.",
          motivo: "plano_expirado",
        },
        { status: 403 }
      );
    }

    const mes = mesAtual();
    const admin = criarClienteSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { erro: "Serviço de créditos indisponível." },
        { status: 503 }
      );
    }

    // Moeda de listas: cada geração consome 1 crédito de lista.
    let saldoListas = 0;
    if (acesso.def.listasMes > 0) {
      const { data: creditosLista } = await admin
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();
      saldoListas = creditosLista?.saldo ?? 0;

      if (saldoListas <= 0) {
        return NextResponse.json(
          {
            erro: `Você usou suas ${acesso.def.listasMes} listas do plano ${acesso.def.nome} neste mês. Faça upgrade em /planos para gerar mais.`,
            motivo: "limite_listas",
          },
          { status: 403 }
        );
      }
    }

    const { data: uso } = await supabase
      .from("uso_mensal")
      .select("empresas_geradas")
      .eq("usuario_id", user.id)
      .eq("mes", mes)
      .maybeSingle();

    const empresasUsadas = uso?.empresas_geradas ?? 0;
    const restante = acesso.def.empresasMes - empresasUsadas;

    if (restante <= 0) {
      return NextResponse.json(
        {
          erro: `Você já usou as ${acesso.def.empresasMes} empresas do plano ${acesso.def.nome} neste mês. Faça upgrade em /planos.`,
          motivo: "limite_empresas",
        },
        { status: 403 }
      );
    }

    const dados = await request.json();
    const segmentos: string[] = Array.isArray(dados.segmentos)
      ? dados.segmentos.filter(
          (s: unknown): s is string => typeof s === "string"
        )
      : [];
    const estado: string | undefined =
      typeof dados.estado === "string" && dados.estado.trim()
        ? normalizarTextoLocal(dados.estado).replace(/\s/g, "")
        : undefined;
    const cidadesBrutas: string[] = Array.isArray(dados.cidades)
      ? dados.cidades.filter(
          (c: unknown): c is string => typeof c === "string"
        )
      : typeof dados.cidade === "string" && dados.cidade.trim()
        ? [dados.cidade]
        : [];
    const cidades = cidadesBrutas
      .map((c) => normalizarTextoLocal(c))
      .filter(Boolean)
      .slice(0, 4);
    const portes: string[] = Array.isArray(dados.portes)
      ? dados.portes.filter(
          (p: unknown): p is string => typeof p === "string"
        )
      : [];
    const codigosPorte = mapearPortesParaCodigos(portes);

    if (segmentos.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum segmento informado." },
        { status: 400 }
      );
    }

    const mapaEmpresas = new Map<string, EmpresaEncontrada>();
    const mapaRazoesSociais = new Set<string>();
    let chamadas = 0;

    void registrarUso("casadosdados");

    const excluiImobiliarios =
      !segmentos.some((s) => SEGMENTOS_IMOBILIARIOS.has(s));

    for (const segmento of segmentos) {
      const codigos = mapaCnae.get(chaveSemAcento(segmento));
      if (!codigos || codigos.length === 0) continue;

      for (const codigo of codigos) {
        if (chamadas >= MAX_CHAMADAS) break;
        if (mapaEmpresas.size >= LIMITE_TOTAL_EMPRESAS) break;
        chamadas += 1;
        try {
          const resposta = await pesquisarRecorte(
            [codigo],
            estado,
            cidades,
            codigosPorte
          );
          if (resposta?.cnpjs) {
            for (const item of resposta.cnpjs) {
              const digitos = (item.cnpj ?? "").replace(/\D/g, "");
              if (!digitos || digitos.length !== 14) continue;
              if (mapaEmpresas.has(digitos)) continue;

              const razaoSocialItem = item.razao_social ?? "";
              const chaveRazao = normalizarTextoLocal(razaoSocialItem);

              // Filiais/matrizes da mesma empresa: mantém só o primeiro CNPJ
              if (
                chaveRazao &&
                mapaRazoesSociais.has(chaveRazao)
              ) {
                continue;
              }

              if (excluiImobiliarios && nomePareceImobiliario(razaoSocialItem)) {
                continue;
              }

              mapaRazoesSociais.add(chaveRazao);
              mapaEmpresas.set(digitos, {
                cnpj: digitos,
                cnpjFormatado: formatarCnpj(digitos),
                razaoSocial: razaoSocialItem,
                nomeFantasia: item.nome_fantasia ?? "",
                situacao:
                  item.situacao_cadastral?.situacao_atual ?? "ATIVA",
                dataSituacao: item.situacao_cadastral?.data?.slice(0, 10) ?? "",
                segmentoIcp: segmento,
                uf: estado ?? "",
                municipio: cidades[0] ?? "",
              });
            }
          }
        } catch {
          // Recorte falhou — segue para o próximo
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (chamadas >= MAX_CHAMADAS) break;
      if (mapaEmpresas.size >= LIMITE_TOTAL_EMPRESAS) break;
    }

    const empresasFinais = Array.from(mapaEmpresas.values()).slice(
      0,
      Math.min(LIMITE_TOTAL_EMPRESAS, restante)
    );

    if (empresasFinais.length > 0) {
      const totalAcumulado = empresasUsadas + empresasFinais.length;
      // Escritas de cobrança sempre com cliente admin: o usuário não
      // pode manipular seu próprio consumo via RLS.
      await admin.from("uso_mensal").upsert(
        {
          usuario_id: user.id,
          mes,
          empresas_geradas: totalAcumulado,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,mes" }
      );

      if (acesso.def.listasMes > 0) {
        await admin
          .from("creditos")
          .update({ saldo: Math.max(0, saldoListas - 1) })
          .eq("usuario_id", user.id);
      }
    }

    return NextResponse.json({
      empresas: empresasFinais,
      totalUnicos: empresasFinais.length,
      recortesPesquisados: chamadas,
      plano: acesso.plano,
      cotaRestante: Math.max(0, restante - empresasFinais.length),
    });
  } catch {
    return NextResponse.json(
      { erro: "Não conseguimos buscar as empresas agora. Tente novamente." },
      { status: 500 }
    );
  }
}
