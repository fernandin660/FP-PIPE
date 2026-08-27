import { NextResponse } from "next/server";
import {
  buscarCnpjPorEmpresa,
  buscarTelefoneMaps,
  buscarDadosCnpj,
} from "../../../../lib/enriquecimento";

export async function GET(requisicao: Request) {
  const url = new URL(requisicao.url);
  const q = url.searchParams.get("q") ?? "Sal Express";

  const resultado: Record<string, unknown> = { query: q };

  const casa = await buscarCnpjPorEmpresa(q).catch((e) => ({ erro: String(e) }));
  resultado.casa_dados = casa;

  if (casa && typeof casa === "object" && "cnpj" in casa && (casa as Record<string, unknown>).cnpj) {
    const brasil = await buscarDadosCnpj((casa as Record<string, string>).cnpj).catch((e) => ({ erro: String(e) }));
    resultado.brasil_api = brasil;
  }

  const maps = await buscarTelefoneMaps(q).catch((e) => ({ erro: String(e) }));
  resultado.maps = maps;

  return NextResponse.json(resultado);
}
