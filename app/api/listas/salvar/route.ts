import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { verificarCreditosBaixos } from "../../../../lib/avisos";

const MAX_LEADS = 50;
const CREDITOS_IA_POR_LEAD = 5;

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, orgId, usuarioId } = gate.ctx!;

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
        organizacao_id: orgId,
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

    // 2. Leads que ainda estão borrados são DESBLOQUEADOS AGORA:
    //    o salvamento debita os créditos de lead automaticamente
    //    (com verificação de saldo) e marca contato_desbloqueado_em.

    // Empresas podem estar salvas na organização atual OU na linha legada
    // do usuário; buscamos nas duas para não perder leads da rodada.
    const [{ data: empresasOrg }, { data: empresasUser }] = await Promise.all([
      supabase
        .from("companies")
        .select("id, cnpj, contato_desbloqueado_em, criado_em")
        .eq("organizacao_id", orgId)
        .in("cnpj", leadsUnicos),
      supabase
        .from("companies")
        .select("id, cnpj, contato_desbloqueado_em, criado_em")
        .eq("usuario_id", usuarioId)
        .in("cnpj", leadsUnicos),
    ]);

    // A constraint legada é por usuario_id + CNPJ. Por isso, uma equipe
    // pode ter mais de uma linha para o mesmo CNPJ; a lista deve usar uma só.
    const todas = [...(empresasOrg ?? []), ...(empresasUser ?? [])]
      .filter(
        (empresa, indice, lista) =>
          lista.findIndex((item) => item.cnpj === empresa.cnpj) === indice
      )
      .sort((a, b) => String(b.criado_em ?? "").localeCompare(String(a.criado_em ?? "")));

    if (todas.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum dos leads selecionados foi encontrado na sua conta." },
        { status: 404 }
      );
    }

    const bloqueadas = todas.filter(
      (linha: { contato_desbloqueado_em: string | null }) =>
        !linha.contato_desbloqueado_em
    );

    let desbloqueadosAgora = 0;

    if (bloqueadas.length > 0) {
      const admin = criarClienteSupabaseAdmin();
      if (!admin) {
        return NextResponse.json(
          { erro: "Serviço de créditos indisponível." },
          { status: 503 }
        );
      }

      // Saldo na organização OU na linha do usuário - usa a maior, igual ao
      // desbloqueio individual, para nunca divergir do valor exibido na tela.
      const [{ data: creditosOrg }, { data: creditosUser }] = await Promise.all([
        admin
          .from("creditos_contatos")
          .select("usuario_id, organizacao_id, saldo")
          .eq("organizacao_id", orgId)
          .maybeSingle(),
        admin
          .from("creditos_contatos")
          .select("usuario_id, organizacao_id, saldo")
          .eq("usuario_id", usuarioId)
          .maybeSingle(),
      ]);

      const creditoAlvo = [creditosOrg, creditosUser]
        .filter((c) => c && (c.saldo ?? 0) > 0)
        .sort((a, b) => (b!.saldo ?? 0) - (a!.saldo ?? 0))[0];

      const saldoBuscador = creditoAlvo?.saldo ?? 0;
      // A tabela não tem coluna "id": debitamos pela organização se a linha
      // for da organização, senão pelo usuário.
      const usaOrg = Boolean(creditosOrg);
      const chaveDebito = usaOrg ? "organizacao_id" : "usuario_id";
      const valorDebito = usaOrg ? orgId : creditoAlvo?.usuario_id ?? "";

      const agora = new Date().toISOString();

      // Débito atômico: só debita se saldo >= quantidade necessária.
      // Substitui a verificação + débito separados para evitar race condition.
      const { data: novoSaldo } = await admin
        .from("creditos_contatos")
        .update({
          saldo: saldoBuscador - bloqueadas.length,
        })
        .eq(chaveDebito, valorDebito)
        .gte("saldo", bloqueadas.length)
        .select("saldo")
        .maybeSingle();

      if (!novoSaldo) {
        return NextResponse.json(
          {
            erro: `Para salvar esta lista faltam ${bloqueadas.length} desbloqueio(s), mas você tem só ${saldoBuscador} crédito(s) de lead. Compre mais em /planos ou desmarque alguns leads.`,
            motivo: "limite_creditos",
            saldoServidor: saldoBuscador,
          },
          { status: 403 }
        );
      }

      await admin
        .from("companies")
        .update({ contato_desbloqueado_em: agora })
        .in(
          "id",
          bloqueadas.map((b: { id: string }) => b.id)
        );

      desbloqueadosAgora = bloqueadas.length;
    }

    // 3. Vincula TODAS as empresas selecionadas (agora desbloqueadas).
    const { error: erroVinculos } = await supabase.from("lista_empresas").insert(
      todas.map((linha: { id: string }) => ({
        lista_id: listaCriada.id,
        company_id: linha.id,
        organizacao_id: orgId,
      }))
    );

    if (erroVinculos) {
      return NextResponse.json(
        { erro: "A lista foi criada, mas não conseguimos vincular os leads. Tente novamente." },
        { status: 500 }
      );
    }

    // 4. Bônus: 5 Créditos de IA por lead salvo (escrita via admin).
    const ganhoIa = todas.length * CREDITOS_IA_POR_LEAD;

    if (ganhoIa > 0) {
      const admin = criarClienteSupabaseAdmin();
      if (admin) {
        const agora = new Date().toISOString();
        const { data: saldoAtual } = await admin
          .from("creditos_ia")
          .select("saldo")
          .eq("organizacao_id", orgId)
          .maybeSingle();

        if (saldoAtual) {
          await admin
            .from("creditos_ia")
            .update({ saldo: saldoAtual.saldo + ganhoIa, atualizado_em: agora })
            .eq("organizacao_id", orgId);
        } else {
          await admin
            .from("creditos_ia")
            .insert({ organizacao_id: orgId, saldo: ganhoIa, atualizado_em: agora });
        }
      }
    }

    // Alerta assíncrono: não bloqueia a resposta
    void verificarCreditosBaixos(orgId);

    return NextResponse.json({
      ok: true,
      listaId: listaCriada.id,
      leadsSalvos: todas.length,
      creditosIaGanhos: ganhoIa,
      desbloqueadosAgora,
    });
  } catch (erro) {
    console.error("Erro ao salvar lista:", erro);
    return NextResponse.json(
      { erro: "NÃ£o conseguimos salvar a lista agora." },
      { status: 500 }
    );
  }
}

