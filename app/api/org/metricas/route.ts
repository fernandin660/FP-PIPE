import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

/**
 * Métricas por membro da organização, para o admin acompanhar a atividade
 * da equipe na página /equipe. Escopado à organização atual (RLS) e só
 * acessível ao papel admin.
 */
export async function GET() {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;

    const { supabase, orgId, papel } = ctx!;

    if (papel !== "admin") {
      return NextResponse.json(
        { erro: "Apenas administradores podem ver as métricas da equipe." },
        { status: 403 }
      );
    }

    const { data: membros } = await supabase
      .from("organizacao_membros")
      .select("usuario_id, email_convite, papel, status, criado_em")
      .eq("organizacao_id", orgId)
      .not("usuario_id", "is", null);

    const listaMembros = (membros ?? []) as Array<{
      usuario_id: string;
      email_convite: string | null;
      papel: string;
      status: string;
      criado_em: string;
    }>;

    // `perfil` é chaveado por usuario_id (não tem organizacao_id).
    const ids = listaMembros.map((m) => m.usuario_id);
    const mapaNome = new Map<string, string | null>();
    if (ids.length > 0) {
      const { data: perfis } = await supabase
        .from("perfil")
        .select("usuario_id, nome_usuario")
        .in("usuario_id", ids);
      for (const p of (perfis ?? []) as Array<{
        usuario_id: string;
        nome_usuario: string | null;
      }>) {
        mapaNome.set(p.usuario_id, p.nome_usuario);
      }
    }

    // Coleta agregada (JS, escopo da org via RLS).
    const [
      { data: empresas },
      { data: contatos },
      { data: listas },
      { data: pipeline },
      { data: historico },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select("usuario_id")
        .eq("organizacao_id", orgId),
      supabase
        .from("contatos")
        .select("usuario_id")
        .eq("organizacao_id", orgId),
      supabase
        .from("listas")
        .select("usuario_id")
        .eq("organizacao_id", orgId),
      supabase
        .from("lead_pipeline")
        .select("responsavel_id")
        .eq("organizacao_id", orgId),
      supabase
        .from("pipeline_historico")
        .select("usuario_id, criado_em")
        .eq("organizacao_id", orgId)
        .order("criado_em", { ascending: false })
        .limit(2000),
    ]);

    const contar = <T extends { usuario_id?: string | null }>(
      linhas: T[] | null
    ) => {
      const mapa = new Map<string, number>();
      for (const l of linhas ?? []) {
        if (!l.usuario_id) continue;
        mapa.set(l.usuario_id, (mapa.get(l.usuario_id) ?? 0) + 1);
      }
      return mapa;
    };

    const contarPipeline = (
      linhas: Array<{ responsavel_id: string | null }> | null
    ) => {
      const mapa = new Map<string, number>();
      for (const l of linhas ?? []) {
        if (!l.responsavel_id) continue;
        mapa.set(l.responsavel_id, (mapa.get(l.responsavel_id) ?? 0) + 1);
      }
      return mapa;
    };

    const mapaEmpresas = contar(empresas as Array<{ usuario_id: string }>);
    const mapaContatos = contar(contatos as Array<{ usuario_id: string }>);
    const mapaListas = contar(listas as Array<{ usuario_id: string }>);
    const mapaPipeline = contarPipeline(
      pipeline as Array<{ responsavel_id: string | null }>
    );

    const mapaAtividade = new Map<string, number>();
    const ultimaAtividade = new Map<string, string>();
    for (const ev of (historico ?? []) as Array<{
      usuario_id: string | null;
      criado_em: string;
    }>) {
      if (!ev.usuario_id) continue;
      mapaAtividade.set(
        ev.usuario_id,
        (mapaAtividade.get(ev.usuario_id) ?? 0) + 1
      );
      if (
        !ultimaAtividade.has(ev.usuario_id) ||
        (ev.criado_em ?? "").localeCompare(
          ultimaAtividade.get(ev.usuario_id) ?? ""
        ) > 0
      ) {
        ultimaAtividade.set(ev.usuario_id, ev.criado_em);
      }
    }

    // Saldos de crédito por usuário.
    const admin = criarClienteSupabaseAdmin();

    const saldos = new Map<
      string,
      { creditos: number | null; contatos: number | null; ia: number | null }
    >();
    if (admin && ids.length > 0) {
      const [
        { data: creds },
        { data: credsContatos },
        { data: credsIa },
      ] = await Promise.all([
        admin.from("creditos").select("usuario_id, saldo").in("usuario_id", ids),
        admin
          .from("creditos_contatos")
          .select("usuario_id, saldo")
          .in("usuario_id", ids),
        admin.from("creditos_ia").select("usuario_id, saldo").in("usuario_id", ids),
      ]);

      for (const c of (creds ?? []) as Array<{ usuario_id: string; saldo: number | null }>) {
        const s = saldos.get(c.usuario_id) ?? { creditos: null, contatos: null, ia: null };
        s.creditos = c.saldo ?? null;
        saldos.set(c.usuario_id, s);
      }
      for (const c of (credsContatos ?? []) as Array<{ usuario_id: string; saldo: number | null }>) {
        const s = saldos.get(c.usuario_id) ?? { creditos: null, contatos: null, ia: null };
        s.contatos = c.saldo ?? null;
        saldos.set(c.usuario_id, s);
      }
      for (const c of (credsIa ?? []) as Array<{ usuario_id: string; saldo: number | null }>) {
        const s = saldos.get(c.usuario_id) ?? { creditos: null, contatos: null, ia: null };
        s.ia = c.saldo ?? null;
        saldos.set(c.usuario_id, s);
      }
    }

    const metricas = listaMembros.map((m) => {
      const s = saldos.get(m.usuario_id);
      return {
        usuario_id: m.usuario_id,
        nome: mapaNome.get(m.usuario_id) ?? null,
        email: m.email_convite ?? null,
        papel: m.papel,
        status: m.status,
        criado_em: m.criado_em,
        empresas: mapaEmpresas.get(m.usuario_id) ?? 0,
        contatos: mapaContatos.get(m.usuario_id) ?? 0,
        listas: mapaListas.get(m.usuario_id) ?? 0,
        leadsPipeline: mapaPipeline.get(m.usuario_id) ?? 0,
        atividade: mapaAtividade.get(m.usuario_id) ?? 0,
        ultimaAtividade: ultimaAtividade.get(m.usuario_id) ?? null,
        creditos: s?.creditos ?? null,
        creditosContatos: s?.contatos ?? null,
        creditosIa: s?.ia ?? null,
      };
    });

    return NextResponse.json({ metricas });
  } catch (erro) {
    console.error("Erro nas métricas da equipe:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar as métricas." },
      { status: 500 }
    );
  }
}
