import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { descriptografarToken, limparVariavelOAuth } from "../../../../lib/email-oauth";

export const runtime = "nodejs";
export const maxDuration = 60;

function base64Url(valor: string): string {
  return Buffer.from(valor).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function substituir(template: string, alvo: { nome?: string | null; empresa?: string | null; cargo?: string | null }): string {
  return template
    .replaceAll("{nome}", alvo.nome || "time")
    .replaceAll("{empresa}", alvo.empresa || "sua empresa")
    .replaceAll("{cargo}", alvo.cargo || "")
    .replaceAll("[Seu Nome]", "")
    .replaceAll("[Seu Contato]", "")
    .replaceAll("[Nome da Empresa]", alvo.empresa || "sua empresa");
}

function emailRemetenteZoho(valor: string): string {
  try {
    const parsed = JSON.parse(valor) as Array<{ mailId?: string; isPrimary?: boolean }>;
    if (Array.isArray(parsed)) return parsed.find((item) => item.isPrimary)?.mailId ?? parsed[0]?.mailId ?? "";
  } catch {}
  return valor;
}

async function obterToken(provedor: string, refreshToken: string): Promise<string> {
  const microsoft = provedor === "microsoft";
  const resposta = await fetch(microsoft ? "https://login.microsoftonline.com/common/oauth2/v2.0/token" : provedor === "zoho" ? "https://accounts.zoho.com/oauth/v2/token" : "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(microsoft ? { client_id: limparVariavelOAuth(process.env.MICROSOFT_OAUTH_CLIENT_ID), client_secret: limparVariavelOAuth(process.env.MICROSOFT_OAUTH_CLIENT_SECRET), refresh_token: refreshToken, grant_type: "refresh_token", scope: "openid profile email offline_access User.Read Mail.Send" } : provedor === "zoho" ? { client_id: limparVariavelOAuth(process.env.ZOHO_OAUTH_CLIENT_ID), client_secret: limparVariavelOAuth(process.env.ZOHO_OAUTH_CLIENT_SECRET), refresh_token: refreshToken, grant_type: "refresh_token" } : { client_id: limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_ID), client_secret: limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_SECRET), refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!resposta.ok) throw new Error("Não foi possível renovar a conexão Gmail.");
  const dados = await resposta.json() as { access_token?: string };
  if (!dados.access_token) throw new Error("O provedor não retornou um token de envio.");
  return dados.access_token;
}

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId, orgId, acesso } = gate.ctx!;
  const clienteAdmin = criarClienteSupabaseAdmin();
  if (!clienteAdmin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });
  const adminSeguro = clienteAdmin;
  const corpo = (await request.json().catch(() => null)) as { campanhaId?: unknown } | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const { data: campanha } = await supabase.from("campanhas").select("id, assunto, corpo, status").eq("id", campanhaId).eq("organizacao_id", orgId).maybeSingle();
  if (!campanha) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });
  if (!campanha.assunto || !campanha.corpo) return NextResponse.json({ erro: "Gere e salve a mensagem antes de enviar." }, { status: 400 });

  const { data: conexao } = await adminSeguro.from("email_conexoes").select("email, provedor, account_id, refresh_token_criptografado").eq("usuario_id", usuarioId).maybeSingle();
  if (!conexao) return NextResponse.json({ erro: "Conecte Gmail, Outlook ou Zoho antes de enviar." }, { status: 400 });
  const { data: destinatarios } = await supabase.from("campanha_destinatarios").select("id, email, nome, empresa, cargo, status").eq("campanha_id", campanhaId).eq("organizacao_id", orgId).in("status", ["nao_contatado", "falhou"]).limit(25);
  if (!destinatarios?.length) return NextResponse.json({ erro: "A campanha não possui destinatários pendentes." }, { status: 400 });

  const limiteDiario = acesso.plano.toLowerCase().includes("platinum") ? 300 : 100;
  const dataUso = new Date().toISOString().slice(0, 10);

  let token: string;
  try { token = await obterToken(conexao.provedor, descriptografarToken(conexao.refresh_token_criptografado)); } catch (erro) { return NextResponse.json({ erro: erro instanceof Error ? erro.message : "Conexão de e-mail inválida." }, { status: 400 }); }
  await supabase.from("campanhas").update({ status: "enviando", atualizado_em: new Date().toISOString() }).eq("id", campanhaId);
  let enviados = 0;
  let falhas = 0;
  let limiteAtingido = false;

  // Reserva uma posição da cota diária de forma atômica/concorrente,
  // com retry para tratar a corrida de inserção da primeira linha.
  async function reservarEnvioSeguro(): Promise<boolean> {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const { data: atual } = await adminSeguro.from("uso_envios_email").select("enviados").eq("organizacao_id", orgId).eq("usuario_id", usuarioId).eq("data", dataUso).maybeSingle();
      const enviadosAtuais = atual?.enviados ?? 0;
      if (enviadosAtuais >= limiteDiario) return false;
      if (!atual) {
        const { error } = await adminSeguro.from("uso_envios_email").insert({ organizacao_id: orgId, usuario_id: usuarioId, data: dataUso, enviados: 1 });
        if (!error) return true;
        continue; // outra reserva criou a linha: tenta o update abaixo
      }
      const { data: atualizado } = await adminSeguro.from("uso_envios_email").update({ enviados: enviadosAtuais + 1, atualizado_em: new Date().toISOString() }).eq("organizacao_id", orgId).eq("usuario_id", usuarioId).eq("data", dataUso).lt("enviados", limiteDiario).select("enviados").maybeSingle();
      if (atualizado) return true;
    }
    return false;
  }

  async function devolverEnvio() {
    const { data: atual } = await adminSeguro.from("uso_envios_email").select("enviados, falhas").eq("organizacao_id", orgId).eq("usuario_id", usuarioId).eq("data", dataUso).maybeSingle();
    if ((atual?.enviados ?? 0) > 0) await adminSeguro.from("uso_envios_email").update({ enviados: atual!.enviados - 1, falhas: (atual?.falhas ?? 0) + 1, atualizado_em: new Date().toISOString() }).eq("organizacao_id", orgId).eq("usuario_id", usuarioId).eq("data", dataUso);
  }

  // Captura valores já validados (não-nulos) para uso dentro das funções
  // aninhadas — preserva o narrowing do TypeScript.
  const assuntoCampanha = campanha!.assunto;
  const corpoCampanha = campanha!.corpo;
  const provedorConexao = conexao!.provedor;
  const emailConexao = conexao!.email;
  const accountIdConexao = conexao!.account_id;

  // Envia UM destinatário com reserva de cota + retry com backoff.
  async function enviarUm(destinatario: { id: unknown; email: string; nome?: string | null; empresa?: string | null; cargo?: string | null }): Promise<void> {
    if (!(await reservarEnvioSeguro())) { limiteAtingido = true; return; }
    const assunto = substituir(assuntoCampanha, destinatario);
    const corpoEmail = substituir(corpoCampanha, destinatario);

    const tentarEnvio = async (): Promise<Response> => {
      if (provedorConexao === "microsoft") {
        return fetch("https://graph.microsoft.com/v1.0/me/sendMail", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: { subject: assunto, body: { contentType: "Text", content: corpoEmail }, toRecipients: [{ emailAddress: { address: destinatario.email } }] }, saveToSentItems: true }) });
      }
      if (provedorConexao === "zoho") {
        if (!accountIdConexao) throw new Error("Conta Zoho sem accountId.");
        return fetch(`https://mail.zoho.com/api/accounts/${accountIdConexao}/messages`, { method: "POST", headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fromAddress: emailRemetenteZoho(emailConexao), toAddress: destinatario.email, subject: assunto, content: corpoEmail, mailFormat: "plaintext" }) });
      }
      const raw = [`To: ${destinatario.email}`, `Subject: ${assunto}`, "Content-Type: text/plain; charset=utf-8", "", corpoEmail].join("\r\n");
      return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: base64Url(raw) }) });
    };

    const MAX_TENTATIVAS = 3;
    try {
      let resposta: Response | null = null;
      for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        resposta = await tentarEnvio();
        // 429 (rate limit) e 5xx são transitórios: retenta com backoff.
        const transitorio = resposta.status === 429 || resposta.status >= 500;
        if (resposta.ok || !transitorio || tentativa === MAX_TENTATIVAS) break;
        const espera = Math.min(1000, 200 * Math.pow(2, tentativa - 1));
        await new Promise((r) => setTimeout(r, espera));
      }
      if (!resposta!.ok) throw new Error(`Provedor ${resposta!.status}`);
      await supabase.from("campanha_destinatarios").update({ status: "enviado", enviado_em: new Date().toISOString(), erro: null }).eq("id", destinatario.id);
      enviados++;
    } catch (erroEnvio) {
      await devolverEnvio();
      falhas++;
      await supabase.from("campanha_destinatarios").update({ status: "falhou", erro: erroEnvio instanceof Error ? erroEnvio.message : "Falha no envio." }).eq("id", destinatario.id);
    }
  }

  // Envia em paralelo com concorrência limitada (equilíbrio entre
  // velocidade e bloqueio por rate-limit do provedor).
  const CONCORRENCIA = 5;
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(CONCORRENCIA, destinatarios.length) }, async () => {
    while (proximo < destinatarios.length) {
      if (limiteAtingido) break;
      const atual = proximo++;
      await enviarUm(destinatarios[atual]);
    }
  });
  await Promise.all(trabalhadores);
  await supabase.from("campanhas").update({ status: !limiteAtingido && enviados === destinatarios.length ? "enviada" : "pronta", atualizado_em: new Date().toISOString() }).eq("id", campanhaId);
  const { count: pendentes } = await supabase
    .from("campanha_destinatarios")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanhaId)
    .eq("organizacao_id", orgId)
    .eq("status", "nao_contatado");
  return NextResponse.json({ enviados, falhas, pendentes: pendentes ?? 0, limiteAtingido, limiteDiario, enviosRestantesHoje: Math.max(0, limiteDiario - ((await adminSeguro.from("uso_envios_email").select("enviados").eq("organizacao_id", orgId).eq("usuario_id", usuarioId).eq("data", dataUso).maybeSingle()).data?.enviados ?? 0)) });
}
