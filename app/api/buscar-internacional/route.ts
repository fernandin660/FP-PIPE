import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { mesAtual } from "../../../lib/planos";
import { registrarUso } from "../../../lib/avisos";
import { formatarCnpj } from "@/lib/conhecimento-cnae";
import { exigirRateLimit } from "../../../lib/rate-limit";

export const maxDuration = 60;

const LIMITE_TOTAL_EMPRESAS = 50;
const USER_AGENT =
  "FP Pipe/1.0 (https://fppipe.com.br; contato@fppipe.com.br)";

// Países das Américas aceitos na busca internacional (ISO 3166-1 alpha-2).
const PAISES_AMERICAS = new Set([
  "us", "ca", "mx", "gt", "bz", "sv", "hn", "ni", "cr", "pa",
  "cu", "do", "ht", "jm", "tt", "bs", "bb", "ag", "dm", "gd",
  "kn", "lc", "vc", "ky", "pr",
  "br", "ar", "cl", "co", "pe", "ve", "ec", "uy", "py", "bo",
  "gy", "sr", "gf", "fk", "ai", "aw", "bm", "bl", "bq", "cw",
  "mf", "ms", "pm", "sx", "tc", "vg", "vi",
]);

const TERMOS_GENERICOS_SEGMENTO = new Set([
  "empresa", "empresas", "servicos", "servico", "comercio", "vendas",
  "solucoes", "solucao", "consultoria", "negocios", "produtos", "produto",
]);

function chaveSemAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// CNPJ sintético e estável derivado do id OSM: começa com 9, tem 14
// dígitos e nunca colide com CNPJs reais. Codifica tipo (1=dó, 2=via,
// 3=relação) + id com zeros à esquerda — único e reversível.
function cnpjDeOsm(tipo: string, id: number): string | null {
  if (!Number.isSafeInteger(id) || id < 0 || id > 9999999999999) return null;
  const codigoTipo =
    tipo === "node" ? "1" : tipo === "way" ? "2" : tipo === "relation" ? "3" : null;
  if (!codigoTipo) return null;
  return `${codigoTipo}${String(id).padStart(13, "0")}`;
}

type ElementoOsm = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function geocodificarCidade(
  cidade: string,
  pais: string
): Promise<{ bbox: [number, number, number, number]; nome: string } | null> {
  const params = new URLSearchParams({
    q: `${cidade}, ${pais.toUpperCase()}`,
    format: "json",
    limit: "1",
    addressdetails: "0",
  });
  void registrarUso("nominatim");
  const resposta = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!resposta.ok) return null;
  const resultados = (await resposta.json()) as Array<{
    boundingbox?: [string, string, string, string];
    display_name?: string;
  }>;
  const primeiro = resultados[0];
  if (!primeiro?.boundingbox) return null;
  const bbox = primeiro.boundingbox.map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return {
    bbox,
    nome: primeiro.display_name?.split(",")[0]?.trim() ?? cidade,
  };
}

async function buscarNoOverpass(
  bboxes: Array<[number, number, number, number]>
): Promise<ElementoOsm[] | null> {
  const filtros = bboxes
    .map((b) => `${b[0]},${b[2]},${b[1]},${b[3]}`)
    .map(
      (f) =>
        `  node["name"]["office"](${f});\n` +
        `  way["name"]["office"](${f});\n` +
        `  node["name"]["shop"](${f});\n` +
        `  way["name"]["shop"](${f});\n` +
        `  node["name"]["craft"](${f});\n` +
        `  way["name"]["craft"](${f});\n` +
        `  node["name"]["industrial"](${f});\n` +
        `  way["name"]["industrial"](${f});`
    )
    .join("\n");
  const consulta = `[out:json][timeout:25];
(
${filtros}
);
out center ${LIMITE_TOTAL_EMPRESAS * 4};`;

  void registrarUso("overpass");

  const resposta = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(consulta)}`,
    signal: AbortSignal.timeout(30000),
  });
  if (!resposta.ok) return null;
  const dados = (await resposta.json()) as { elements?: ElementoOsm[] };
  return dados.elements ?? [];
}

export async function POST(request: Request) {
  const bloqueado = await exigirRateLimit(request, "buscar-internacional", 10, 60);
  if (bloqueado) return bloqueado;

  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, orgId, acesso } = gate.ctx!;

    // Busca internacional é exclusiva dos planos Internacionais.
    if (!acesso.def.internacional) {
      return NextResponse.json(
        {
          erro:
            "A busca internacional faz parte dos planos 🌎 Internacionais. Faça upgrade em /planos.",
          motivo: "plano_nacional",
        },
        { status: 403 }
      );
    }

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
        .eq("organizacao_id", orgId)
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

    const mes = mesAtual();
    const { data: uso } = await supabase
      .from("uso_mensal")
      .select("empresas_geradas")
      .eq("organizacao_id", orgId)
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

    const corpo = await request.json();
    const paisBruto =
      typeof corpo.pais === "string"
        ? chaveSemAcento(corpo.pais).replace(/[^a-z]/g, "")
        : "";
    const cidadesBrutas: string[] = Array.isArray(corpo.cidades)
      ? corpo.cidades.filter(
          (c: unknown): c is string => typeof c === "string"
        )
      : typeof corpo.cidade === "string" && corpo.cidade.trim()
        ? [corpo.cidade]
        : [];
    const cidadesBuscadas = cidadesBrutas
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 4);
    const segmento =
      typeof corpo.segmento === "string" && corpo.segmento.trim()
        ? corpo.segmento.trim()
        : "";

    const pais = paisBruto.slice(0, 2);
    if (!PAISES_AMERICAS.has(pais)) {
      return NextResponse.json(
        {
          erro:
            "Escolha um país das Américas disponível na busca internacional.",
        },
        { status: 400 }
      );
    }
    if (cidadesBuscadas.length === 0) {
      return NextResponse.json(
        { erro: "Informe ao menos uma cidade para buscar (até 4)." },
        { status: 400 }
      );
    }
    if (!segmento) {
      return NextResponse.json(
        { erro: "Informe o segmento para buscar." },
        { status: 400 }
      );
    }

    // Geocodifica cada cidade (Nominatim pede ~1 req/s: respeita o ritmo).
    const geos: Array<{
      bbox: [number, number, number, number];
      nome: string;
    }> = [];
    for (let i = 0; i < cidadesBuscadas.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1100));
      try {
        const geo = await geocodificarCidade(cidadesBuscadas[i], pais);
        if (geo) geos.push(geo);
      } catch {
        // Cidade falhou — segue para a próxima.
      }
    }

    if (geos.length === 0) {
      return NextResponse.json(
        {
          erro: `Não encontramos as cidades informadas nesse país (${cidadesBuscadas.join(
            ", "
          )}). Verifique os nomes e tente novamente.`,
        },
        { status: 404 }
      );
    }

    let elementos: ElementoOsm[] | null = null;
    try {
      elementos = await buscarNoOverpass(geos.map((g) => g.bbox));
    } catch {
      elementos = null;
    }

    if (!elementos) {
      return NextResponse.json(
        {
          erro:
            "O mapa público está sobrecarregado agora. Tente novamente em alguns segundos.",
        },
        { status: 503 }
      );
    }

    const tokensSegmento = chaveSemAcento(segmento)
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !TERMOS_GENERICOS_SEGMENTO.has(t));

    const casaComSegmento = (elemento: ElementoOsm): boolean => {
      if (tokensSegmento.length === 0) return true;
      const tags = elemento.tags ?? {};
      const haystacks = [
        tags.name ?? "",
        tags["operator"] ?? "",
        tags.office ?? "",
        tags.shop ?? "",
        tags.craft ?? "",
        tags.industrial ?? "",
        tags.industry ?? "",
        tags.product ?? "",
      ].map(chaveSemAcento);
      return tokensSegmento.some((token) =>
        haystacks.some((texto) => texto.includes(token))
      );
    };

    // Descobre a qual cidade buscada o elemento pertence pelo ponto
    // dentro do bbox de cada geocodificação.
    const cidadeDoElemento = (elemento: ElementoOsm): string => {
      const lat = elemento.lat ?? elemento.center?.lat;
      const lon = elemento.lon ?? elemento.center?.lon;
      if (typeof lat === "number" && typeof lon === "number") {
        for (const g of geos) {
          const [sul, norte, oeste, leste] = g.bbox;
          if (lat >= sul && lat <= norte && lon >= oeste && lon <= leste) {
            return g.nome;
          }
        }
      }
      return geos[0].nome;
    };

    const mapaEmpresas = new Map<string, unknown>();
    const chavesNome = new Set<string>();
    let restantesParaMeta = Math.min(LIMITE_TOTAL_EMPRESAS, restante);

    const adicionarElemento = (
      elemento: ElementoOsm,
      exigirSegmento: boolean
    ): boolean => {
      if (restantesParaMeta <= 0) return false;
      const tags = elemento.tags ?? {};
      const nome = (tags.name ?? "").trim();
      if (!nome) return false;
      if (exigirSegmento && !casaComSegmento(elemento)) return false;

      const chaveUnica = `${chaveSemAcento(nome)}|${
        (tags["addr:city"] ?? chaveSemAcento(cidadeDoElemento(elemento))).slice(
          0,
          20
        )
      }`;
      if (chavesNome.has(chaveUnica)) return false;

      const telefone =
        tags.phone ??
        tags["contact:phone"] ??
        tags["contact:mobile"] ??
        null;
      const siteBruto =
        tags.website ?? tags["contact:website"] ?? tags.url ?? null;
      const email =
        tags.email ?? tags["contact:email"] ?? null;

      const enderecoStr = [
        [tags["addr:street"], tags["addr:housenumber"]]
          .filter((p): p is string => Boolean(p && p.trim()))
          .join(", "),
        tags["addr:city"] ?? cidadeDoElemento(elemento),
      ]
        .filter(Boolean)
        .join(" · ");

      const cnpj = cnpjDeOsm(elemento.type, elemento.id);
      if (!cnpj || mapaEmpresas.has(cnpj)) return false;

      chavesNome.add(chaveUnica);
      mapaEmpresas.set(cnpj, {
        cnpj,
        cnpjFormatado: formatarCnpj(cnpj),
        razaoSocial: nome,
        nomeFantasia: "",
        situacao: "ATIVA",
        dataSituacao: "",
        segmentoIcp: segmento,
        uf: tags["addr:state"]
          ? tags["addr:state"].toUpperCase().slice(0, 2)
          : pais.toUpperCase(),
        municipio: tags["addr:city"] ?? cidadeDoElemento(elemento),
        endereco: enderecoStr,
        telefone: telefone?.trim() ?? null,
        email: email?.trim().toLowerCase() ?? null,
        site: siteBruto?.trim() ?? null,
        origem: "osm",
        osmTipo: elemento.type,
        osmId: elemento.id,
      });
      restantesParaMeta -= 1;
      return true;
    };

    // 1ª passada: quem bate com o segmento. 2ª passada: completa com
    // outros negócios nomeados da região se faltou resultado.
    for (const elemento of elementos) adicionarElemento(elemento, true);
    if (restantesParaMeta > 0) {
      for (const elemento of elementos) adicionarElemento(elemento, false);
    }

    const empresasFinais = Array.from(mapaEmpresas.values());

    if (empresasFinais.length > 0) {
      const totalAcumulado = empresasUsadas + empresasFinais.length;
      await admin.from("uso_mensal").upsert(
        {
          organizacao_id: orgId,
          mes,
          empresas_geradas: totalAcumulado,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "organizacao_id,mes" }
      );

      if (acesso.def.listasMes > 0) {
        await admin
          .from("creditos")
          .update({ saldo: Math.max(0, saldoListas - 1) })
          .eq("organizacao_id", orgId);
      }
    }

    return NextResponse.json({
      empresas: empresasFinais,
      totalUnicos: empresasFinais.length,
      recortesPesquisados: 1,
      plano: acesso.plano,
      cotaRestante: Math.max(0, restante - empresasFinais.length),
      cidadeResolvida: geos.map((g) => g.nome).join(", "),
    });
  } catch {
    return NextResponse.json(
      { erro: "Não conseguimos buscar as empresas agora. Tente novamente." },
      { status: 500 }
    );
  }
}
