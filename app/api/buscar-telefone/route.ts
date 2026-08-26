import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { exigirRateLimit } from "../../../lib/rate-limit";
import { enriquecerTelefonesContato } from "../../../lib/enriquecimento";

// ============================================================
// POST /api/buscar-telefone
//
// Busca telefone de um contato via cascade completa:
// Google Search → Maps → Casa dos Dados → Brasil API
//
// Body: { linkedinUrl, nomeEmpresa, nomePessoa?, cidade?, uf?, cnpj? }
// ============================================================

export async function POST(req: Request) {
  const bloqueado = await exigirRateLimit(req, "buscar-telefone", 15, 60);
  if (bloqueado) return bloqueado;

  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  let corpo: {
    linkedinUrl?: string;
    nomeEmpresa?: string;
    nomePessoa?: string;
    cidade?: string;
    uf?: string;
    cnpj?: string;
  };

  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const linkedinUrl = String(corpo.linkedinUrl ?? "").trim();
  const nomeEmpresa = String(corpo.nomeEmpresa ?? "").trim();
  const nomePessoa = String(corpo.nomePessoa ?? "").trim();

  if (!linkedinUrl && !nomeEmpresa) {
    return NextResponse.json(
      { erro: "Informe pelo menos o LinkedIn URL ou o nome da empresa." },
      { status: 400 }
    );
  }

  const resultado = await enriquecerTelefonesContato(
    linkedinUrl || `busca:${nomeEmpresa}`,
    nomeEmpresa,
    nomePessoa || undefined,
    corpo.cidade || undefined,
    corpo.uf || undefined,
    corpo.cnpj || undefined
  );

  return NextResponse.json({
    ok: true,
    telefones: resultado.telefones,
    website: resultado.website ?? null,
    fontes: resultado.fontes,
  });
}
