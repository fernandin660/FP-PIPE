import { NextResponse } from "next/server";

const URL_CASADOSDADOS =
  "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa";

function semAcento(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type RespostaCasadosDados = {
  cnpjs?: Array<{
    cnpj?: string;
    razao_social?: string;
    nome_fantasia?: string;
    situacao_cadastral?: { situacao_atual?: string };
  }>;
};

export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  try {
    const corpo = {
      nome_empresa: [semAcento(q)],
      situacao_cadastral: ["ATIVA"],
      limite: 6,
    };

    const resposta = await fetch(URL_CASADOSDADOS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15000),
    });

    if (!resposta.ok) {
      return NextResponse.json({ resultados: [] });
    }

    const dados = (await resposta.json()) as RespostaCasadosDados;
    const lista = dados.cnpjs ?? [];

    const tokens = semAcento(q)
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const pontuar = (item: { razao_social?: string; nome_fantasia?: string }): number => {
      const alvo = semAcento(
        `${item.razao_social ?? ""} ${item.nome_fantasia ?? ""}`
      );
      return tokens.filter((t) => alvo.includes(t)).length;
    };

    const ordenada = [...lista]
      .sort((a, b) => pontuar(b) - pontuar(a))
      .slice(0, 6);

    const resultados = ordenada.map((e) => ({
      cnpj: e.cnpj ?? "",
      razao_social: e.razao_social ?? "",
      nome_fantasia: e.nome_fantasia ?? "",
      ativa:
        e.situacao_cadastral?.situacao_atual?.toUpperCase() === "ATIVA",
    }));

    return NextResponse.json({ resultados });
  } catch {
    return NextResponse.json({ resultados: [] });
  }
}
