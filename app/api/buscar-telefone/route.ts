import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { exigirRateLimit } from "../../../lib/rate-limit";
import { enriquecerTelefonesContato } from "../../../lib/enriquecimento";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";

// ============================================================
// POST /api/buscar-telefone
//
// Busca telefone de um contato via cascade completa:
// Google Search → Maps → Casa dos Dados → Brasil API
//
// Body: { linkedinUrl, nomeEmpresa, nomePessoa?, cidade?, uf?, cnpj? }
//
// Cobra 1 crédito de telefone por contato com telefone encontrado
// (mesma regra de /api/buscar-contato). Sem saldo → recusa (fail-closed).
// ============================================================

const CUSTO_TELEFONE = 1;

export async function POST(req: Request) {
  const bloqueado = await exigirRateLimit(req, "buscar-telefone", 15, 60);
  if (bloqueado) return bloqueado;

  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, orgId } = gate.ctx!;

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

  const { data: saldoRegistro, error: erroSaldo } = await supabase
    .from("creditos_telefone")
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();
  const saldo = saldoRegistro?.saldo ?? 0;
  if (erroSaldo) {
    return NextResponse.json({ erro: "Não foi possível verificar o saldo de telefones." }, { status: 500 });
  }
  if (saldo < CUSTO_TELEFONE) {
    return NextResponse.json(
      { erro: "Você não possui créditos de telefone suficientes.", motivo: "sem_creditos_telefone", saldoTelefones: saldo },
      { status: 403 }
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

  // Debita 1 crédito apenas se encontrou telefone novo.
  let novoSaldo = saldo;
  let debitado = false;
  if (resultado.telefones.length > 0) {
    novoSaldo = saldo - CUSTO_TELEFONE;
    const admin = criarClienteSupabaseAdmin();
    if (admin) {
      const { error } = await admin
        .from("creditos_telefone")
        .update({ saldo: novoSaldo })
        .eq("organizacao_id", orgId);
      if (!error) debitado = true;
      else novoSaldo = saldo;
    }
  }

  return NextResponse.json({
    ok: true,
    telefones: resultado.telefones,
    website: resultado.website ?? null,
    fontes: resultado.fontes,
    saldoTelefones: novoSaldo,
    debitado,
  });
}
