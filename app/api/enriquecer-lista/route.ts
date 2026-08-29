import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { filtrarEmails } from "../../../lib/emails";
import {
  buscarContatosNoSite,
  buscarDadosEmpresaGoogle,
  buscarTelefoneMaps,
} from "../../../lib/enriquecimento";

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

async function enriquecerEmpresa(empresa: Empresa, admin: NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>) {
  const nome = empresa.nome_fantasia || empresa.razao_social || "";
  if (!nome) return;

  const [google, maps] = await Promise.all([
    buscarDadosEmpresaGoogle(nome).catch(() => ({ website: undefined, linkedin_url: undefined })),
    buscarTelefoneMaps(nome).catch(() => ({ telefone: undefined, website: undefined })),
  ]);
  const website = empresa.website || google.website || null;
  const site = website ? await buscarContatosNoSite(website).catch(() => ({ emails: [], telefones: [] })) : { emails: [], telefones: [] };

  const telefones = unicos([
    ...(empresa.telefones_extra ?? []),
    ...(empresa.telefone ? [empresa.telefone] : []),
    ...(maps.telefone ? [maps.telefone] : []),
    ...site.telefones,
  ]);
  const emails = filtrarEmails([
    ...(empresa.emails_extra ?? []),
    ...(empresa.email ? [empresa.email] : []),
    ...site.emails,
  ]);

  await admin.from("companies").update({
    website,
    linkedin: empresa.linkedin || google.linkedin_url || null,
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
  const { orgId } = gate.ctx!;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });

  const corpo = (await request.json().catch(() => null)) as { cnpjs?: unknown; listaId?: unknown } | null;
  let cnpjs = Array.isArray(corpo?.cnpjs)
    ? [...new Set(corpo.cnpjs.filter((valor): valor is string => typeof valor === "string").map((valor) => valor.replace(/\D/g, "")).filter((valor) => valor.length === 14))].slice(0, 50)
    : [];
  if (cnpjs.length === 0 && typeof corpo?.listaId === "string") {
    const { data: vinculos } = await admin.from("lista_empresas").select("company_id").eq("lista_id", corpo.listaId).eq("organizacao_id", orgId);
    const ids = [...new Set((vinculos ?? []).map((v) => v.company_id))];
    const { data: empresasDaLista } = await admin.from("companies").select("cnpj").in("id", ids);
    cnpjs = [...new Set((empresasDaLista ?? []).map((empresa) => empresa.cnpj?.replace(/\D/g, "")).filter((cnpj): cnpj is string => Boolean(cnpj && cnpj.length === 14)))].slice(0, 50);
  }
  if (cnpjs.length === 0) return NextResponse.json({ enriquecidas: 0 });

  const { data: empresas } = await admin.from("companies")
    .select("id, nome_fantasia, razao_social, telefone, telefones_extra, email, emails_extra, website, linkedin")
    .eq("organizacao_id", orgId)
    .in("cnpj", cnpjs);

  let enriquecidas = 0;
  const pendentes = (empresas ?? []).filter((empresa) => !empresa.website || !empresa.email);
  for (let inicio = 0; inicio < pendentes.length; inicio += 3) {
    const lote = pendentes.slice(inicio, inicio + 3);
    await Promise.all(lote.map(async (empresa) => {
      await enriquecerEmpresa(empresa as Empresa, admin);
      enriquecidas += 1;
    }));
  }
  return NextResponse.json({ enriquecidas });
}
