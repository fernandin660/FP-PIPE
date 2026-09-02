import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { filtrarEmails } from "../../../lib/emails";
import { runProvider } from "../../../lib/enrichment/engine";
import type { ContextoEnriquecimento } from "../../../lib/enrichment/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Empresa = {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  telefone: string | null;
  telefones_extra: string[] | null;
  email: string | null;
  emails_extra: string[] | null;
  website: string | null;
  linkedin: string | null;
};

function unicos(valores: string[]): string[] {
  return [...new Set(valores.map((valor) => valor.trim()).filter(Boolean))];
}

async function enriquecerEmpresa(
  empresa: Empresa,
  admin: NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>,
  ctx?: ContextoEnriquecimento
) {
  const nome = empresa.nome_fantasia || empresa.razao_social || "";
  if (!nome) return;

  // O adapter (enriquecerEmpresa) continua dono do MERGE por campo, dedup,
  // filtrarEmails e da escrita em companies. O engine.runProvider() é a
  // instrumentação de cada chamada (ledger/erro — aqui sem custo/cache).
  const pedido = {
    orgId: ctx?.organizacao_id ?? null,
    usuarioId: ctx?.usuario_id ?? null,
    tipo: "website" as const,
    alvo: { tipo: "empresa" as const, chave: nome, nomeEmpresa: nome },
  };

  const [google, maps] = await Promise.all([
    runProvider("serper", pedido, ctx ?? {}),
    runProvider("maps", { ...pedido, tipo: "telefone" as const }, ctx ?? {}),
  ]);

  const website = empresa.website || google.dados?.website || null;
  const site = website
    ? await runProvider(
        "site",
        { ...pedido, tipo: "email" as const, alvo: { ...pedido.alvo, website } },
        ctx ?? {}
      )
    : null;

  const telefones = unicos([
    ...(empresa.telefones_extra ?? []),
    ...(empresa.telefone ? [empresa.telefone] : []),
    ...(maps.dados?.telefones?.[0]?.numero ? [maps.dados.telefones[0].numero] : []),
    ...(site?.dados?.telefones ?? []).map((t) => t.numero),
  ]);
  const emails = filtrarEmails([
    ...(empresa.emails_extra ?? []),
    ...(empresa.email ? [empresa.email] : []),
    ...(site?.dados?.emails ?? []).map((e) => e.email),
  ]);

  await admin.from("companies").update({
    website,
    linkedin: empresa.linkedin || google.dados?.linkedinEmpresa || null,
    telefone: telefones[0] ?? null,
    telefones_extra: telefones.slice(1),
    email: emails[0] ?? null,
    emails_extra: emails.slice(1),
    atualizado_em: new Date().toISOString(),
  }).eq("id", empresa.id);
}

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { orgId, usuarioId } = gate.ctx!;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });

  const corpo = (await request.json().catch(() => null)) as { cnpjs?: unknown; listaId?: unknown } | null;
  let cnpjs = Array.isArray(corpo?.cnpjs)
    ? [...new Set(corpo.cnpjs.filter((valor): valor is string => typeof valor === "string").map((valor) => valor.replace(/\D/g, "")).filter((valor) => valor.length === 14))].slice(0, 10)
    : [];
  if (cnpjs.length === 0 && typeof corpo?.listaId === "string") {
    const { data: vinculos } = await admin.from("lista_empresas").select("company_id").eq("lista_id", corpo.listaId).eq("organizacao_id", orgId);
    const ids = [...new Set((vinculos ?? []).map((v) => v.company_id))];
    const { data: empresasDaLista } = await admin.from("companies").select("cnpj").in("id", ids);
    cnpjs = [...new Set((empresasDaLista ?? []).map((empresa) => empresa.cnpj?.replace(/\D/g, "")).filter((cnpj): cnpj is string => Boolean(cnpj && cnpj.length === 14)))].slice(0, 10);
  }
  if (cnpjs.length === 0) return NextResponse.json({ enriquecidas: 0 });

  const { data: empresas } = await admin.from("companies")
    .select("id, nome_fantasia, razao_social, telefone, telefones_extra, email, emails_extra, website, linkedin")
    .eq("organizacao_id", orgId)
    .in("cnpj", cnpjs);

  let enriquecidas = 0;
  const pendentes = (empresas ?? []).filter((empresa) => !empresa.website || !empresa.email);
  for (let inicio = 0; inicio < pendentes.length; inicio += 2) {
    const lote = pendentes.slice(inicio, inicio + 2);
    await Promise.all(lote.map(async (empresa) => {
      await enriquecerEmpresa(empresa as Empresa, admin, {
        organizacao_id: orgId,
        usuario_id: usuarioId,
      });
      enriquecidas += 1;
    }));
  }
  return NextResponse.json({ enriquecidas });
}
