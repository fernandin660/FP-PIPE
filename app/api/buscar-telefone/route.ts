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
//
// Este endpoint prioriza telefones PÚBLICOS (gratuitos). Se a cascade
// encontrar pelo menos um telefone público, ele é retornado sem custo.
// Só recusamos quando A ÚNICA origem seria a API paga MillionPhones
// (fallback via LinkedIn) e não houver crédito de telefone — essa
// cobrança é tratada pelo buscador de contatos (/api/buscar-contato).
// ============================================================

const CUSTO_TELEFONE = 1;

export async function POST(req: Request) {
  const bloqueado = await exigirRateLimit(req, "buscar-telefone", 15, 60);
  if (bloqueado) return bloqueado;

  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, orgId, usuarioId } = gate.ctx!;

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

  // Saldo de telefone ANTES de qualquer débito (o engine.runProvider aplica
  // o custo do MillionPhones centralizado; aqui só validamos e reportamos).
  const { data: saldoRegistro } = await supabase
    .from("creditos_telefone")
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();
  const saldoAntes = saldoRegistro?.saldo ?? 0;

  const resultado = await enriquecerTelefonesContato(
    linkedinUrl || `busca:${nomeEmpresa}`,
    nomeEmpresa,
    nomePessoa || undefined,
    corpo.cidade || undefined,
    corpo.uf || undefined,
    corpo.cnpj || undefined,
    { organizacao_id: orgId, usuario_id: usuarioId }
  );

  const veioDoMillionPhones = resultado.fontes.includes("millionphones");
  let saldoTelefones: number | null = null;

  // Telefones públicos → gratuitos. Só cobra se a única origem foi a API
  // paga MillionPhones (via LinkedIn). O débito é feito pelo engine; aqui
  // apenas validamos o saldo e expomos o novo saldo após a cobrança.
  if (veioDoMillionPhones) {
    if (saldoAntes < CUSTO_TELEFONE) {
      return NextResponse.json(
        { erro: "Você não possui créditos de telefone suficientes para buscar via LinkedIn.", motivo: "sem_creditos_telefone", saldoTelefones: saldoAntes },
        { status: 403 }
      );
    }
    saldoTelefones = saldoAntes - CUSTO_TELEFONE;
  }

  return NextResponse.json({
    ok: true,
    telefones: resultado.telefones,
    website: resultado.website ?? null,
    fontes: resultado.fontes,
    cobrado_millionphones: veioDoMillionPhones,
    ...(saldoTelefones !== null ? { saldoTelefones } : {}),
  });
}

export const maxDuration = 60;
