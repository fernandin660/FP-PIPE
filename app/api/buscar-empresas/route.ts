import { NextResponse } from "next/server";
import {
  normalizarTextoLocal,
  formatarCnpj,
} from "@/lib/conhecimento-cnae";
import {
  cnaesDeSegmentoComSubselecao,
  filtrarCnaesPorTipos,
  segmentosClassificacao,
  segmentosDosSubsegmentos,
  tiposEmpresaDisponiveis,
} from "@/lib/classificacao";
import { cnaesCompletosDoSegmento } from "@/lib/cnae-mapa";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { mesAtual } from "../../../lib/planos";
import { registrarUso } from "../../../lib/avisos";
import { exigirRateLimit } from "../../../lib/rate-limit";
import { registrarUsoMensalEmpresas } from "../../../lib/uso-mensal";

const URL_CASADOSDADOS =
  "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa";
const LIMITE_POR_RECORTE = 20;
const MAX_CHAMADAS = 6;
const LIMITE_TOTAL_EMPRESAS = 50;
// Paginação defensiva: cada recorte avança de página apenas enquanto a página
// atual não trouxer nenhuma empresa nova (todas já salvas na org), com teto
// para não estourar o custo/chamadas do provedor.
const MAX_PAGINAS_POR_RECORTE = 4;

const MAPA_PORTE: Record<string, string[]> = {
  MEI: [],
  ME: ["01"],
  EPP: ["03"],
  "Médio/Grande": ["05"],
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

// Segmento (rótulo oficial) → id canônico, aceitando variação de acento/caixa
// (o `.id` do segmento é o mesmo rótulo exibido na interface).
const mapaSegmentoId = new Map<string, string>(
  segmentosClassificacao.map((segmento) => [
    chaveSemAcento(segmento.id),
    segmento.id,
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
  codigosPorte: string[] = [],
  incluirMei = false,
  pagina = 1
): Promise<RespostaCasadosDados | null> {
  const corpo: Record<string, unknown> = {
    codigo_atividade_principal: codigosCnae,
    situacao_cadastral: ["ATIVA"],
    limite: LIMITE_POR_RECORTE,
    pagina,
  };
  if (uf) corpo.uf = [uf];
  if (municipios.length > 0) corpo.municipio = municipios.slice(0, 4);
  if (codigosPorte.length > 0) {
    corpo.porte_empresa = { codigos: codigosPorte };
  }
  if (incluirMei) {
    corpo.mei = { optante: true };
  }

  const resposta = await fetch(URL_CASADOSDADOS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(8000),
  });

  if (!resposta.ok) return null;
  return (await resposta.json()) as RespostaCasadosDados;
}

export async function POST(request: Request) {
  const bloqueado = await exigirRateLimit(request, "buscar-empresas", 10, 60);
  if (bloqueado) return bloqueado;

  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, orgId, usuarioId, acesso } = gate.ctx!;

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
    // MEI é uma subcategoria da Microempresa (porte 01). Quando "ME" também
    // está selecionado, o código 01 já cobre os MEIs — evita AND indevido.
    const incluirMei = portes.includes("MEI") && !portes.includes("ME");

    // Subsegmentos (ids canônicos da hierarquia) e tipos de empresa são
    // refinamentos opcionais: segmento sozinho já cobre todos os subsegmentos.
    const subsegmentos: string[] = Array.isArray(dados.subsegmentos)
      ? dados.subsegmentos.filter(
          (s: unknown): s is string => typeof s === "string"
        )
      : [];
    const tiposEmpresa: string[] = Array.isArray(dados.tiposEmpresa)
      ? dados.tiposEmpresa.filter(
          (t: unknown): t is string =>
            typeof t === "string" &&
            (tiposEmpresaDisponiveis as readonly string[]).includes(t)
        )
      : [];
    // Somente matriz: CNPJ da sede tem número de ordem "0001" (dígitos 9–12).
    const somenteMatriz = dados.somenteMatriz === true;

    // Se o cliente mandar só subsegmentos (sem segmentos), infere os pais.
    const segmentosEfetivos =
      segmentos.length > 0 ? segmentos : segmentosDosSubsegmentos(subsegmentos);

    if (segmentosEfetivos.length === 0 && subsegmentos.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum segmento informado." },
        { status: 400 }
      );
    }

    // CNPJs que a organização já possui em companies. As buscas vêm e
    // já inserem as empresas na org (upsert por organizacao_id+cnpj), então a
    // tabela é a fonte de "empresas já salvas". Filtrar aqui evita que uma
    // nova busca com os mesmos filtros repita a lista anterior.
    const { data: cnpjsOrg } = await supabase
      .from("companies")
      .select("cnpj")
      .eq("organizacao_id", orgId);
    const { data: cnpjsUsuario } = await supabase
      .from("companies")
      .select("cnpj")
      .eq("usuario_id", usuarioId);
    const cnpjsJaSalvos = new Set<string>();
    for (const linha of [...(cnpjsOrg ?? []), ...(cnpjsUsuario ?? [])]) {
      const digitos = (linha.cnpj ?? "").replace(/\D/g, "");
      if (digitos.length === 14) cnpjsJaSalvos.add(digitos);
    }

    const mapaEmpresas = new Map<string, EmpresaEncontrada>();
    const mapaRazoesSociais = new Set<string>();
    let chamadas = 0;

    void registrarUso("casadosdados");

    // Expande segmentos → subsegmentos → CNAEs, aplicando o tipo de empresa.
    // Quando o segmento tem subsegmentos escolhidos, usa os CNAEs curados
    // desses subsegmentos. Sem subsegmentos, usa a UNIÃO dos curados com TODOS
    // os CNAEs das divisões da hierarquia CNAE 2.0 (tabela cnae_completa) —
    // cobertura muito maior sem perder os códigos curados (variações de
    // subclasse que o import de classes não cobre).
    const recortes: Array<{ segmento: string; codigo: string }> = [];
    for (const segmento of segmentosEfetivos) {
      const segmentoId = mapaSegmentoId.get(chaveSemAcento(segmento));
      if (!segmentoId) continue;

      const subDoSegmento = (subsegmentos ?? []).filter((id) =>
        (segmentosClassificacao.find((s) => s.id === segmentoId)?.subsegmentos ??
          []).some((s) => s.id === id)
      );

      let codigosTodo =
        subDoSegmento.length > 0
          ? cnaesDeSegmentoComSubselecao(segmentoId, subDoSegmento)
          : [
              ...new Set([
                ...cnaesDeSegmentoComSubselecao(segmentoId, []),
                ...(await cnaesCompletosDoSegmento(admin, segmentoId)),
              ]),
            ];

      const codigoFiltrados = filtrarCnaesPorTipos(codigosTodo, tiposEmpresa);
      for (const codigo of codigoFiltrados) {
        recortes.push({ segmento: segmentoId, codigo });
      }
    }

    // Distribui as chamadas em rodadas entre os segmentos escolhidos: com o
    // custo atual (máx. MAX_CHAMADAS), cada segmento participa da busca em vez
    // de esgotar a cota no primeiro segmento da lista.
    const recortesEscolhidos: typeof recortes = [];
    {
      const porSegmento = new Map<string, string[]>();
      for (const recorte of recortes) {
        const lista = porSegmento.get(recorte.segmento);
        if (lista) lista.push(recorte.codigo);
        else porSegmento.set(recorte.segmento, [recorte.codigo]);
      }
      const chavesSegmento = Array.from(porSegmento.keys());
      const indicePorSegmento = new Map<string, number>(
        chavesSegmento.map((chave) => [chave, 0])
      );
      let restantes = MAX_CHAMADAS;
      while (restantes > 0) {
        let avancou = false;
        for (const chave of chavesSegmento) {
          if (restantes === 0) break;
          const lista = porSegmento.get(chave)!;
          const indice = indicePorSegmento.get(chave)!;
          if (indice >= lista.length) continue;
          recortesEscolhidos.push({ segmento: chave, codigo: lista[indice] });
          indicePorSegmento.set(chave, indice + 1);
          restantes -= 1;
          avancou = true;
        }
        if (!avancou) break;
      }
    }

    const excluiImobiliarios =
      !recortes.some((r) => SEGMENTOS_IMOBILIARIOS.has(r.segmento));

    const CONCURRENCIA_MAXIMA = 3;

    async function processarRecorte({ segmento, codigo }: { segmento: string; codigo: string }) {
      if (mapaEmpresas.size >= LIMITE_TOTAL_EMPRESAS) return;
      try {
        // Pagina até achar empresa nova que ainda não foi salva na org. Paramos
        // na primeira página que contribui algo — não "consome" o resto do
        // resultado do CasasDados para o lead pedir mais páginas depois.
        let chavePaginaAnterior = "";
        for (let pagina = 1; pagina <= MAX_PAGINAS_POR_RECORTE; pagina++) {
          if (mapaEmpresas.size >= LIMITE_TOTAL_EMPRESAS) return;
          const resposta = await pesquisarRecorte(
            [codigo],
            estado,
            cidades,
            codigosPorte,
            incluirMei,
            pagina
          );
          if (!resposta?.cnpjs || resposta.cnpjs.length === 0) return;

          // Se a API ignora "pagina" (devolve o mesmo resultado), parar:
          // paginar repetido só gastaria chamadas sem trazer novidade.
          const chavePagina = resposta.cnpjs
            .map((i) => (i.cnpj ?? "").replace(/\D/g, ""))
            .filter((d) => d.length === 14)
            .sort()
            .join(",");
          if (chavePagina !== "" && chavePagina === chavePaginaAnterior) return;
          chavePaginaAnterior = chavePagina;

          const total = resposta.total ?? 0;
          const totalPaginas =
            total > 0 ? Math.ceil(total / LIMITE_POR_RECORTE) : pagina;

          let novas = 0;
          for (const item of resposta.cnpjs) {
            const digitos = (item.cnpj ?? "").replace(/\D/g, "");
            if (!digitos || digitos.length !== 14) continue;
            if (mapaEmpresas.has(digitos)) continue;
            if (cnpjsJaSalvos.has(digitos)) continue;

            // Só matriz: descarta filiais (ordem diferente de 0001).
            if (somenteMatriz && digitos.substring(8, 12) !== "0001") {
              continue;
            }

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
            novas += 1;
          }

          // Página atual contribuiu: não paginar mais este recorte.
          if (novas > 0) return;

          // Não há mais páginas no provedor para este recorte.
          if (pagina >= totalPaginas) return;
        }
      } catch {
        // Recorte falhou — segue para o próximo
      }
    }

    // Processa recortes em paralelo com concorrência limitada
    async function processarComConcorrencia() {
      const fila = [...recortesEscolhidos];
      const executando: Promise<void>[] = [];

      async function processarProximo() {
        while (fila.length > 0 && mapaEmpresas.size < LIMITE_TOTAL_EMPRESAS) {
          const recorte = fila.shift();
          if (!recorte) break;
          await processarRecorte(recorte);
          chamadas += 1;
        }
      }

      // Inicia até CONCURRENCIA_MAXIMA workers
      for (let i = 0; i < Math.min(CONCURRENCIA_MAXIMA, recortesEscolhidos.length); i++) {
        executando.push(processarProximo());
      }

      await Promise.all(executando);
    }

    await processarComConcorrencia();

    const empresasFinais = Array.from(mapaEmpresas.values()).slice(
      0,
      Math.min(LIMITE_TOTAL_EMPRESAS, restante)
    );

    if (empresasFinais.length > 0) {
      const totalAcumulado = empresasUsadas + empresasFinais.length;
      // Escritas de cobrança sempre com cliente admin: o usuário não
      // pode manipular seu próprio consumo via RLS.
      const erroUso = await registrarUsoMensalEmpresas(
        admin,
        orgId,
        usuarioId,
        mes,
        totalAcumulado
      );
      if (erroUso) {
        return NextResponse.json(
          { erro: "Não conseguimos registrar seu consumo. Tente novamente." },
          { status: 500 }
        );
      }

      if (acesso.def.listasMes > 0) {
        await admin.rpc("debitar_saldo_org", {
          p_tabela: "creditos",
          p_org: orgId,
          p_qtd: 1,
        });
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
