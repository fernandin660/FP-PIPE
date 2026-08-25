import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { registrarUso } from "../../../../lib/avisos";

function limparNomeEmpresa(nome: string): string {
  return nome
    .replace(
      /\s*(LTDA|L\.T\.D\.A|S\/A|S\.A|SA|EIRELI|ME|EPP|EMPRESA INDIVIDUAL|SOCIEDADE SIMPLES|EDIFICIO|CONDOMINIO)\b.*$/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarLinkedin(link: string): string | null {
  try {
    const url = new URL(link);
    if (
      url.hostname !== "linkedin.com" &&
      url.hostname !== "www.linkedin.com"
    ) {
      return null;
    }
    const partes = url.pathname.split("/").filter(Boolean);
    if (partes[0] !== "company" || !partes[1]) return null;
    return `https://www.linkedin.com/company/${partes[1].replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

type ItemBusca = { link?: string; title?: string };

export async function POST(requisicao: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId } = gate.ctx!;

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const dados = (corpo ?? {}) as { companyId?: unknown; cnpj?: unknown };

  let consulta = supabase
    .from("companies")
    .select("id, nome_fantasia, razao_social, municipio, uf, linkedin");

  const companyId =
    typeof dados.companyId === "string" ? dados.companyId.trim() : "";
  const cnpjBruto =
    typeof dados.cnpj === "string" ? dados.cnpj.replace(/\D/g, "") : "";

  if (companyId) {
    consulta = consulta.eq("id", companyId);
  } else if (cnpjBruto.length === 14) {
    consulta = consulta.eq("cnpj", cnpjBruto);
  } else {
    return NextResponse.json(
      { erro: "Informe companyId ou cnpj." },
      { status: 400 }
    );
  }

  const { data: empresa } = await consulta.maybeSingle();

  if (!empresa) {
    return NextResponse.json(
      { erro: "Empresa não encontrada." },
      { status: 404 }
    );
  }

  if (empresa.linkedin) {
    return NextResponse.json({
      linkedin: empresa.linkedin,
      cobrado: false,
      mensagem: "Esta empresa já tem LinkedIn salvo.",
    });
  }

  const chaveSerper = process.env.SERPER_API_KEY;
  const chaveOpenai = process.env.OPENAI_API_KEY;

  if (!chaveSerper && !chaveOpenai) {
    return NextResponse.json(
      { erro: "Integração de busca ainda não configurada." },
      { status: 503 }
    );
  }

  const termo = limparNomeEmpresa(
    empresa.nome_fantasia || empresa.razao_social || ""
  );

  if (!termo) {
    return NextResponse.json(
      { erro: "Empresa sem nome para buscar." },
      { status: 400 }
    );
  }

  // Saldo antes de gastar com a busca.
  const { data: creditos } = await supabase
    .from("creditos_contatos")
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();

  let saldo = creditos?.saldo;

  if (saldo === null || saldo === undefined) {
    const { data: criada } = await supabase
      .from("creditos_contatos")
      .insert({ organizacao_id: orgId, saldo: 5 })
      .select("saldo")
      .maybeSingle();
    saldo = criada?.saldo ?? 0;
  }

  if ((saldo ?? 0) < 1) {
    return NextResponse.json(
      { erro: "Sem créditos de contato suficientes.", precisaCreditos: true },
      { status: 402 }
    );
  }

  // Comparação sem acento/caixa: "Logística" casa com "logistica".
  const normalizarTexto = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const STOPWORDS = new Set([
    "e",
    "de",
    "da",
    "do",
    "das",
    "dos",
    "em",
    "por",
    "com",
  ]);

  const tokensBase = normalizarTexto(termo)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  // Núcleo da marca para a consulta: razão social inteira é específica
  // demais e esconde as páginas certas do Google.
  const nucleo =
    tokensBase.length >= 2
      ? tokensBase.slice(0, 2).join(" ")
      : tokensBase.join(" ");

  let itens: ItemBusca[] = [];

  try {
    if (chaveSerper) {
      // Caminho preferencial: Serper (busca do Google via API).
      void registrarUso("serper");

      const contexto = [empresa.municipio, empresa.uf]
        .filter(Boolean)
        .join(" ");

      const respostaBusca = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": chaveSerper,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `"${nucleo}" site:linkedin.com/company${
            contexto ? ` ${contexto}` : ""
          }`,
          num: 10,
        }),
        cache: "no-store",
      });

      if (!respostaBusca.ok) {
        return NextResponse.json(
          { erro: "Falha na busca. Tente novamente." },
          { status: 502 }
        );
      }

      const dadosBusca = (await respostaBusca.json()) as {
        organic?: ItemBusca[];
      };
      itens = dadosBusca.organic ?? [];
    } else {
      // Fallback: OpenAI com busca na web (sem cadastro extra).
      void registrarUso("openai");

      const respostaIA = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${chaveOpenai}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-search-preview",
          input: `Qual é a página oficial da empresa "${termo}" no LinkedIn (endereço começando com linkedin.com/company/)? Procure no Google. Responda APENAS com a URL completa encontrada, ou NONE se não encontrar.`,
          tools: [{ type: "web_search_preview" }],
        }),
        cache: "no-store",
      });

      if (!respostaIA.ok) {
        return NextResponse.json(
          { erro: "Falha na busca. Tente novamente." },
          { status: 502 }
        );
      }

      const dadosIA = (await respostaIA.json()) as {
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };

      const texto = (dadosIA.output ?? [])
        .flatMap((parte) => parte.content ?? [])
        .map((bloco) => bloco.text ?? "")
        .join(" ");

      itens = Array.from(
        new Set(
          texto.match(
            /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/[A-Za-z0-9_\-%.]+/gi
          ) ?? []
        )
      ).map((link) => ({ link }));
    }
  } catch {
    return NextResponse.json(
      { erro: "Falha na busca. Tente novamente." },
      { status: 502 }
    );
  }

  const tituloPorLink = new Map<string, string>();
  for (const item of itens) {
    if (!item.link) continue;
    const link = normalizarLinkedin(item.link);
    if (link && !tituloPorLink.has(link)) {
      tituloPorLink.set(link, item.title ?? "");
    }
  }

  // Palavra no SLUG da página vale 2 (é o @ da empresa no LinkedIn);
  // no título do resultado vale 1.
  const candidatos = Array.from(tituloPorLink.entries())
    .map(([link, titulo]) => {
      const slug = normalizarTexto(link.split("/company/")[1] ?? "");
      const tituloNormalizado = normalizarTexto(titulo);

      let pontos = 0;
      let acertosSlug = 0;

      for (const t of tokensBase) {
        if (slug.includes(t)) {
          pontos += 2;
          acertosSlug += 1;
        }
        if (tituloNormalizado.includes(t)) {
          pontos += 1;
        }
      }

      return { link, pontos, acertosSlug };
    })
    .sort((a, b) => b.pontos - a.pontos);

  const melhor = candidatos[0];

  // Exige ao menos uma palavra da marca no slug e força mínima total:
  // evita salvar um "Atacadão Centro Sul" ou um "oficialcentrosul"
  // no lugar de "Centrosul Logística".
  const minimo = Math.max(1, tokensBase.length);

  if (
    !melhor ||
    melhor.acertosSlug < 1 ||
    melhor.pontos < minimo
  ) {
    return NextResponse.json({
      linkedin: null,
      cobrado: false,
      mensagem:
        "Não encontrei uma página do LinkedIn que batesse com confiança. Vale conferir na mão.",
    });
  }

  // Salva no registro do usuário (RLS garante que é dele).
  await supabase
    .from("companies")
    .update({ linkedin: melhor.link })
    .eq("id", empresa.id);

  // Cobra 1 crédito de contato pelo achado.
  const admin = criarClienteSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  await admin
    .from("creditos_contatos")
    .update({ saldo: Math.max(0, (saldo ?? 0) - 1) })
    .eq("organizacao_id", orgId);

  return NextResponse.json({
    linkedin: melhor.link,
    cobrado: true,
  });
}
