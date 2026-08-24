import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

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

  const { supabase, usuarioId } = gate.ctx!;

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const dados = (corpo ?? {}) as { companyId?: unknown; cnpj?: unknown };

  let consulta = supabase
    .from("companies")
    .select("id, nome_fantasia, razao_social, linkedin");

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

  const chave = process.env.SERPER_API_KEY;

  if (!chave) {
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
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  let saldo = creditos?.saldo;

  if (saldo === null || saldo === undefined) {
    const { data: criada } = await supabase
      .from("creditos_contatos")
      .insert({ usuario_id: usuarioId, saldo: 5 })
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

  let itens: ItemBusca[] = [];

  try {
    const respostaBusca = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": chave,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${termo} site:linkedin.com/company`,
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
  } catch {
    return NextResponse.json(
      { erro: "Falha na busca. Tente novamente." },
      { status: 502 }
    );
  }

  const tokens = termo
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  const candidatos = itens
    .map((item) =>
      item.link ? normalizarLinkedin(item.link) : null
    )
    .filter((link): link is NonNullable<typeof link> => Boolean(link))
    .map((link) => {
      const alvo = `${link} ${itens.find((i) => i.link && normalizarLinkedin(i.link) === link)?.title ?? ""}`.toLowerCase();
      const pontos = tokens.reduce(
        (total, t) => total + (alvo.includes(t) ? 1 : 0),
        0
      );
      return { link, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos);

  const melhor = candidatos[0];

  if (!melhor) {
    return NextResponse.json({
      linkedin: null,
      cobrado: false,
      mensagem: "Nenhum LinkedIn da empresa encontrado no Google.",
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
    .eq("usuario_id", usuarioId);

  return NextResponse.json({
    linkedin: melhor.link,
    cobrado: true,
  });
}
