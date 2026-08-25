import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

const MAX_LEADS = 50;
const CREDITOS_IA_POR_LEAD = 5;

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, usuarioId } = gate.ctx!;

    const corpo = await request.json();

    const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
    const segmentos: string[] = Array.isArray(corpo.segmentos)
      ? corpo.segmentos.filter((s: unknown): s is string => typeof s === "string")
      : [];
    const icpResumo = typeof corpo.icpResumo === "string" ? corpo.icpResumo : "";
    const localizacao =
      typeof corpo.localizacao === "string" ? corpo.localizacao : "Brasil";
    const cnpjs: string[] = Array.isArray(corpo.cnpjs)
      ? corpo.cnpjs
          .filter((c: unknown): c is string => typeof c === "string")
          .map((c: string) => c.replace(/\D/g, ""))
          .filter((c: string) => c.length === 14)
      : [];

    if (!nome || cnpjs.length === 0) {
      return NextResponse.json(
        { erro: "Dados da lista incompletos." },
        { status: 400 }
      );
    }

    const leadsUnicos = Array.from(new Set(cnpjs)).slice(0, MAX_LEADS);

    // 1. Cria a lista.
    const { data: listaCriada, error: erroLista } = await supabase
      .from("listas")
      .insert({
        usuario_id: usuarioId,
        nome,
        segmentos,
        icp_resumo: icpResumo,
        localizacao,
      })
      .select("id")
      .single();

    if (erroLista || !listaCriada) {
      return NextResponse.json(
        { erro: "NÃ£o conseguimos criar a lista." },
        { status: 500 }
      );
    }

    // 2. Vincula APENAS as empresas cujo contato foi desbloqueado
    //    (pago com crédito de buscador). Salvar "às cegas" burlaria
    //    a moeda — então filtra aqui no servidor, não confia no front.
    const { data: linhasEmpresas } = await supabase
      .from("companies")
      .select("id, cnpj, contato_desbloqueado_em")
      .eq("usuario_id", usuarioId)
      .in("cnpj", leadsUnicos);

    const empresasLiberadas = (linhasEmpresas ?? []).filter(
      (linha: { contato_desbloqueado_em: string | null }) =>
        Boolean(linha.contato_desbloqueado_em)
    );

    const ignoradosSemDesbloqueio = leadsUnicos.length - empresasLiberadas.length;

    if (empresasLiberadas.length === 0) {
      return NextResponse.json(
        {
          erro:
            "Nenhum dos leads selecionados está desbloqueado. Desbloqueie com créditos antes de salvar na lista.",
          motivo: "sem_desbloqueio",
          ignorados: ignoradosSemDesbloqueio,
        },
        { status: 403 }
      );
    }

    if (empresasLiberadas.length > 0) {
      await supabase.from("lista_empresas").insert(
        empresasLiberadas.map((linha: { id: string }) => ({
          lista_id: listaCriada.id,
          company_id: linha.id,
        }))
      );
    }

    // 3. Bônus: 5 Créditos de IA por lead salvo (escrita via admin).
    const ganhoIa =
      empresasLiberadas.length * CREDITOS_IA_POR_LEAD;

    if (ganhoIa > 0) {
      const admin = criarClienteSupabaseAdmin();
      if (admin) {
        const agora = new Date().toISOString();
        const { data: saldoAtual } = await admin
          .from("creditos_ia")
          .select("saldo")
          .eq("usuario_id", usuarioId)
          .maybeSingle();

        if (saldoAtual) {
          await admin
            .from("creditos_ia")
            .update({ saldo: saldoAtual.saldo + ganhoIa, atualizado_em: agora })
            .eq("usuario_id", usuarioId);
        } else {
          await admin
            .from("creditos_ia")
            .insert({ usuario_id: usuarioId, saldo: ganhoIa, atualizado_em: agora });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      listaId: listaCriada.id,
      leadsSalvos: empresasLiberadas.length,
      creditosIaGanhos: ganhoIa,
      ignoradosSemDesbloqueio,
    });
  } catch {
    return NextResponse.json(
      { erro: "NÃ£o conseguimos salvar a lista agora." },
      { status: 500 }
    );
  }
}

