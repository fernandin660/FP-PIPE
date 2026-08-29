import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";

type CorpoCampanha = {
  listaId?: unknown;
  nome?: unknown;
};

type CorpoEdicaoCampanha = {
  campanhaId?: unknown;
  assunto?: unknown;
  corpo?: unknown;
};

const USUARIO_TESTE = "f395a6b1-9d16-4b80-b97a-8dfdf13ededa";

function emailValido(valor: unknown): valor is string {
  return typeof valor === "string" &&
    /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valor.trim()) &&
    !/\.(webp|png|jpe?g|gif|svg|css|js)$/i.test(valor.trim()) &&
    !valor.toLowerCase().includes("category_");
}

export async function GET(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, orgId } = gate.ctx!;
  const listaId = new URL(request.url).searchParams.get("listaId") ?? "";
  if (!listaId) return NextResponse.json({ erro: "Lista não informada." }, { status: 400 });

  const { data } = await supabase
    .from("campanhas")
    .select("id, lista_id, nome, assunto, corpo, geracoes_usadas, status, criado_em, atualizado_em")
    .eq("organizacao_id", orgId)
    .eq("lista_id", listaId)
    .maybeSingle();

  if (!data) return NextResponse.json({ campanha: null, destinatarios: [] });

  const { data: destinatarios } = await supabase
    .from("campanha_destinatarios")
    .select("id, contato_id, company_id, email, status, erro, enviado_em")
    .eq("campanha_id", data.id)
    .order("criado_em", { ascending: true });

  return NextResponse.json({ campanha: data, destinatarios: destinatarios ?? [] });
}

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId, orgId } = gate.ctx!;

  let corpo: CorpoCampanha;
  try {
    corpo = (await request.json()) as CorpoCampanha;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const listaId = String(corpo.listaId ?? "");
  const nome = String(corpo.nome ?? "").trim();
  if (!listaId) return NextResponse.json({ erro: "Lista não informada." }, { status: 400 });

  const { data: lista } = await supabase
    .from("listas")
    .select("id, nome")
    .eq("id", listaId)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!lista) return NextResponse.json({ erro: "Lista não encontrada." }, { status: 404 });

  const { data: existente } = await supabase
    .from("campanhas")
    .select("id, lista_id, nome, assunto, corpo, geracoes_usadas, status")
    .eq("organizacao_id", orgId)
    .eq("lista_id", listaId)
    .maybeSingle();
  if (existente) return NextResponse.json({ campanha: existente, existente: true });

  const { data: vinculos } = await supabase
    .from("lista_empresas")
    .select("company_id")
    .eq("lista_id", listaId)
    .eq("organizacao_id", orgId);
  const companyIds = [...new Set((vinculos ?? []).map((v) => v.company_id))];
  if (companyIds.length === 0) return NextResponse.json({ erro: "A lista não possui leads." }, { status: 400 });

  const [{ data: empresas }, { data: contatos }] = await Promise.all([
    supabase.from("companies").select("id, email, emails_extra, campeao_email, aprovador_email, nome_fantasia, razao_social").in("id", companyIds),
    supabase.from("contatos").select("id, company_id, email, emails, nome, cargo, empresa").in("company_id", companyIds),
  ]);

  const destinatarios: Array<{ contato_id: string | null; company_id: string; email: string; organizacao_id: string; nome: string | null; empresa: string | null; cargo: string | null }> = [];
  const vistos = new Set<string>();
  for (const empresa of empresas ?? []) {
    const emails = [empresa.email, empresa.campeao_email, empresa.aprovador_email, ...(Array.isArray(empresa.emails_extra) ? empresa.emails_extra : [])];
    for (const email of emails) {
      if (emailValido(email) && !vistos.has(email.toLowerCase())) {
        vistos.add(email.toLowerCase());
        destinatarios.push({ contato_id: null, company_id: empresa.id, email: email.toLowerCase(), organizacao_id: orgId, nome: null, cargo: null, empresa: empresa.nome_fantasia ?? empresa.razao_social ?? null });
      }
    }
  }
  for (const contato of contatos ?? []) {
    const emails = [contato.email, ...(Array.isArray(contato.emails) ? contato.emails : [])];
    for (const email of emails) {
      if (emailValido(email) && !vistos.has(email.toLowerCase())) {
        vistos.add(email.toLowerCase());
        destinatarios.push({ contato_id: contato.id, company_id: contato.company_id, email: email.toLowerCase(), organizacao_id: orgId, nome: contato.nome ?? null, cargo: contato.cargo ?? null, empresa: contato.empresa ?? null });
      }
    }
  }

  const { data: campanha, error } = await supabase
    .from("campanhas")
    .insert({ organizacao_id: orgId, usuario_id: usuarioId, lista_id: listaId, nome: nome || `Campanha - ${lista.nome}` })
    .select("id, lista_id, nome, assunto, corpo, geracoes_usadas, status")
    .single();
  if (error || !campanha) return NextResponse.json({ erro: "Não foi possível criar a campanha." }, { status: 500 });

  if (destinatarios.length > 0) {
    const limite = usuarioId === USUARIO_TESTE ? 10000 : 100;
    await supabase.from("campanha_destinatarios").insert(destinatarios.slice(0, limite).map((d) => ({ ...d, campanha_id: campanha.id })));
  }
  return NextResponse.json({ campanha, destinatarios: destinatarios.length });
}

export async function PATCH(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, orgId } = gate.ctx!;
  const corpo = (await request.json().catch(() => null)) as CorpoEdicaoCampanha | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const assunto = String(corpo?.assunto ?? "").trim();
  const texto = String(corpo?.corpo ?? "").trim();
  if (!campanhaId || !assunto || !texto) return NextResponse.json({ erro: "Assunto e corpo são obrigatórios." }, { status: 400 });

  const { data, error } = await supabase
    .from("campanhas")
    .update({ assunto, corpo: texto, status: "pronta", atualizado_em: new Date().toISOString() })
    .eq("id", campanhaId)
    .eq("organizacao_id", orgId)
    .select("id, lista_id, nome, assunto, corpo, geracoes_usadas, status")
    .single();
  if (error || !data) return NextResponse.json({ erro: "Não foi possível salvar a campanha." }, { status: 500 });
  return NextResponse.json({ campanha: data });
}
