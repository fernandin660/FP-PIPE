import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";

function emailValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(valor.trim()) && !/\.(webp|png|jpe?g|gif|svg|css|js)$/i.test(valor.trim()) && !valor.toLowerCase().includes("category_");
}

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, orgId } = gate.ctx!;
  const corpo = (await request.json().catch(() => null)) as { campanhaId?: unknown } | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const { data: campanha } = await supabase.from("campanhas").select("id, lista_id").eq("id", campanhaId).eq("organizacao_id", orgId).maybeSingle();
  if (!campanha) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });
  const { data: vinculos } = await supabase.from("lista_empresas").select("company_id").eq("lista_id", campanha.lista_id).eq("organizacao_id", orgId);
  const ids = [...new Set((vinculos ?? []).map((v) => v.company_id))];
  if (!ids.length) return NextResponse.json({ destinatarios: 0 });
  const [{ data: empresas }, { data: contatos }] = await Promise.all([
    supabase.from("companies").select("id, email, emails_extra, campeao_email, aprovador_email, nome_fantasia, razao_social").in("id", ids),
    supabase.from("contatos").select("id, company_id, email, emails, nome, cargo, empresa").in("company_id", ids),
  ]);
  const linhas: Array<Record<string, unknown>> = [];
  const vistos = new Set<string>();
  for (const empresa of empresas ?? []) {
    for (const valor of [empresa.email, empresa.campeao_email, empresa.aprovador_email, ...(Array.isArray(empresa.emails_extra) ? empresa.emails_extra : [])]) {
      if (emailValido(valor) && !vistos.has(valor.toLowerCase())) {
        vistos.add(valor.toLowerCase());
        linhas.push({ campanha_id: campanhaId, organizacao_id: orgId, company_id: empresa.id, email: valor.toLowerCase(), nome: null, cargo: null, empresa: empresa.nome_fantasia ?? empresa.razao_social ?? null });
      }
    }
  }
  for (const contato of contatos ?? []) {
    for (const valor of [contato.email, ...(Array.isArray(contato.emails) ? contato.emails : [])]) {
      if (emailValido(valor) && !vistos.has(valor.toLowerCase())) {
        vistos.add(valor.toLowerCase());
        linhas.push({ campanha_id: campanhaId, organizacao_id: orgId, company_id: contato.company_id, contato_id: contato.id, email: valor.toLowerCase(), nome: contato.nome ?? null, cargo: contato.cargo ?? null, empresa: contato.empresa ?? null });
      }
    }
  }
  if (linhas.length) {
    await supabase.from("campanha_destinatarios").upsert(linhas, { onConflict: "campanha_id,email", ignoreDuplicates: true });
  }
  const emailsValidos = new Set(linhas.map((linha) => linha.email));
  const { data: atuais } = await supabase.from("campanha_destinatarios").select("id, email").eq("campanha_id", campanhaId).eq("organizacao_id", orgId);
  const idsInvalidos = (atuais ?? []).filter((linha) => !emailsValidos.has(linha.email)).map((linha) => linha.id);
  if (idsInvalidos.length) await supabase.from("campanha_destinatarios").delete().in("id", idsInvalidos);
  return NextResponse.json({ destinatarios: linhas.length });
}
