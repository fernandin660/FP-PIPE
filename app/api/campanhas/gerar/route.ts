import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { chamarIa } from "../../../../lib/ia";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId, orgId } = gate.ctx!;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Serviço de créditos indisponível." }, { status: 503 });

  const corpo = (await request.json().catch(() => null)) as { campanhaId?: unknown; instrucoes?: unknown; objetivo?: unknown } | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const instrucoes = String(corpo?.instrucoes ?? "").trim();
  if (!campanhaId) return NextResponse.json({ erro: "Campanha não informada." }, { status: 400 });

  const { data: campanha } = await supabase
    .from("campanhas")
    .select("id, nome, objetivo, geracoes_usadas, status")
    .eq("id", campanhaId)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!campanha) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });
  if (campanha.geracoes_usadas >= 3) return NextResponse.json({ erro: "Esta campanha já usou as 3 gerações disponíveis.", limite: true }, { status: 403 });
  const objetivos: Record<string, string> = {
    agendar_reuniao: "agendar uma reunião de 15 minutos",
    descobrir_responsavel: "descobrir quem é o responsável correto pela área",
    fazer_diagnostico: "abrir uma conversa de diagnóstico sobre a operação",
    apresentar_solucao: "apresentar a solução de forma objetiva",
    follow_up: "fazer um follow-up de uma conversa anterior",
    reativar_contato: "reativar um contato que parou de responder",
    gerar_interesse: "gerar interesse e iniciar uma conversa",
  };
  const objetivo = String(corpo?.objetivo ?? campanha.objetivo ?? "gerar_interesse");
  const objetivoTexto = objetivos[objetivo] ?? objetivos.gerar_interesse;

  const { data: perfil } = await supabase
    .from("perfil")
    .select("nome_empresa, nome_usuario, area_atuacao, produtos_servicos, nichos")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const { data: destinatarios } = await supabase
    .from("campanha_destinatarios")
    .select("email, company_id")
    .eq("campanha_id", campanhaId)
    .eq("organizacao_id", orgId)
    .limit(100);

  const saldoBusca = await admin
    .from("creditos_ia")
    .select("usuario_id, saldo, organizacao_id")
    .eq("organizacao_id", orgId)
    .maybeSingle();
  const saldo = saldoBusca.data?.saldo ?? 0;
  if (saldo < 1) return NextResponse.json({ erro: "Você não possui créditos de IA disponíveis.", motivo: "sem_creditos_ia" }, { status: 403 });

  const textoPrompt = `Crie uma campanha de e-mail B2B para os leads da lista "${campanha.nome}".
Empresa que envia: ${perfil?.nome_empresa ?? "não informado"}
Nome de quem envia: ${perfil?.nome_usuario ?? perfil?.nome_empresa ?? "equipe comercial"}
Área: ${perfil?.area_atuacao ?? "não informado"}
Produtos e serviços: ${perfil?.produtos_servicos ?? "não informado"}
Nichos: ${Array.isArray(perfil?.nichos) ? perfil.nichos.join(", ") : "não informado"}
Finalidade da campanha: ${objetivoTexto}
Quantidade de destinatários: ${destinatarios?.length ?? 0}
Instruções adicionais do usuário: ${instrucoes || "escreva uma abordagem comercial humana e objetiva"}

Gere um assunto de até 60 caracteres e um corpo de até 150 palavras. Use as variáveis {nome}, {empresa} e {cargo} quando ajudarem. Não invente dados. NÃO use placeholders como [Seu Nome], [Seu Contato], [Nome da Empresa] ou colchetes. Finalize usando o nome de quem envia informado acima. Retorne somente JSON no formato {"assunto":"...","corpo":"..."}.`;

  let gerado: { assunto?: string; corpo?: string };
  try {
    const resposta = await chamarIa(textoPrompt, { maxTokens: 700, temperature: 0.7, timeoutMs: 60000 });
    gerado = JSON.parse(resposta.response) as { assunto?: string; corpo?: string };
  } catch {
    return NextResponse.json({ erro: "Não conseguimos gerar a campanha agora. Nenhum crédito foi descontado." }, { status: 500 });
  }
  if (!gerado.assunto?.trim() || !gerado.corpo?.trim()) return NextResponse.json({ erro: "A IA não retornou uma campanha válida." }, { status: 500 });
  const nomeRemetente = perfil?.nome_usuario ?? perfil?.nome_empresa ?? "Equipe comercial";
  gerado.corpo = gerado.corpo
    .replaceAll("[Seu Nome]", nomeRemetente)
    .replaceAll("[Seu Contato]", "")
    .replaceAll("[Nome da Empresa]", "{empresa}");

  const { data: novoSaldo } = await admin
    .from("creditos_ia")
    .update({ saldo: saldo - 1 })
    .eq("organizacao_id", orgId)
    .gte("saldo", 1)
    .select("saldo")
    .maybeSingle();
  if (!novoSaldo) return NextResponse.json({ erro: "O saldo de IA mudou durante a geração. Tente novamente.", motivo: "saldo_alterado" }, { status: 409 });

  const novaGeracao = campanha.geracoes_usadas + 1;
  const { data: atualizada, error } = await supabase
    .from("campanhas")
    .update({ assunto: gerado.assunto.trim(), corpo: gerado.corpo.trim(), objetivo, geracoes_usadas: novaGeracao, status: "pronta", atualizado_em: new Date().toISOString() })
    .eq("id", campanhaId)
    .eq("organizacao_id", orgId)
    .select("id, nome, assunto, corpo, objetivo, geracoes_usadas, status")
    .single();
  if (error || !atualizada) {
    await admin.from("creditos_ia").update({ saldo }).eq("organizacao_id", orgId);
    return NextResponse.json({ erro: "Não foi possível salvar a campanha. O crédito foi devolvido." }, { status: 500 });
  }
  return NextResponse.json({ campanha: atualizada, saldoIa: novoSaldo.saldo, geracoesRestantes: 3 - novaGeracao });
}
