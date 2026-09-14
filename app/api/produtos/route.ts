import { NextResponse } from "next/server";

import { exigirAcesso, type ContextoAcesso } from "../../../lib/gate";
import { contarMembros, isAdmin } from "../../../lib/org";

function validarNome(nome: unknown): string | null {
  if (typeof nome !== "string") return null;
  const limpo = nome.trim();
  if (limpo.length < 1 || limpo.length > 120) return null;
  return limpo;
}

async function podeEditarProdutos(ctx: ContextoAcesso): Promise<boolean> {
  if (isAdmin(ctx.papel)) return true;
  const totalMembros = await contarMembros(ctx.supabase, ctx.orgId);
  return totalMembros === 1;
}

export async function GET() {
  const { ctx, resposta } = await exigirAcesso();
  if (!ctx) return resposta;

  const { data: produtos, error } = await ctx.supabase
    .from("produtos")
    .select("id, nome, criado_em")
    .eq("organizacao_id", ctx.orgId)
    .order("nome");

  if (error) {
    return NextResponse.json(
      { erro: "Falha ao carregar produtos." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    produtos,
    podeEditar: await podeEditarProdutos(ctx),
  });
}

export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (!ctx) return resposta;

  if (!(await podeEditarProdutos(ctx))) {
    return NextResponse.json(
      { erro: "Somente o admin da equipe pode gerenciar produtos." },
      { status: 403 }
    );
  }

  const corpo = await req.json().catch(() => null);
  const nome = validarNome(corpo?.nome);
  if (!nome) {
    return NextResponse.json(
      { erro: "Informe o nome do produto." },
      { status: 400 }
    );
  }

  const { data, error } = await ctx.supabase
    .from("produtos")
    .insert({ organizacao_id: ctx.orgId, nome })
    .select("id, nome, criado_em")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { erro: "Esse produto já está cadastrado." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { erro: "Falha ao salvar o produto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ produto: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (!ctx) return resposta;

  if (!(await podeEditarProdutos(ctx))) {
    return NextResponse.json(
      { erro: "Somente o admin da equipe pode gerenciar produtos." },
      { status: 403 }
    );
  }

  const corpo = await req.json().catch(() => null);
  const id = typeof corpo?.id === "string" ? corpo.id : null;
  const nome = validarNome(corpo?.nome);
  if (!id || !nome) {
    return NextResponse.json(
      { erro: "Informe o produto e o novo nome." },
      { status: 400 }
    );
  }

  const { data, error } = await ctx.supabase
    .from("produtos")
    .update({ nome })
    .eq("id", id)
    .eq("organizacao_id", ctx.orgId)
    .select("id, nome, criado_em")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { erro: "Esse produto já está cadastrado." },
        { status: 409 }
      );
    }
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { erro: "Produto não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { erro: "Falha ao renomear o produto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ produto: data });
}

export async function DELETE(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (!ctx) return resposta;

  if (!(await podeEditarProdutos(ctx))) {
    return NextResponse.json(
      { erro: "Somente o admin da equipe pode gerenciar produtos." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { erro: "Informe o produto a remover." },
      { status: 400 }
    );
  }

  const { error } = await ctx.supabase
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("organizacao_id", ctx.orgId);

  if (error) {
    return NextResponse.json(
      { erro: "Falha ao remover o produto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}