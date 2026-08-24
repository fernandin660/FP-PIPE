import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { chamarOpenaiJson } from "../../../lib/providers/openai";

export const runtime = "nodejs";

const CANAIS_VALIDOS = new Set(["email", "linkedin", "whatsapp", "ligacao"]);
const CREDITOS_BOAS_VINDAS = 10;
const CUSTO_ABORDAGEM = 1;

type Empresa = {
  razao_social: string | null;
  nome_fantasia: string | null;
  municipio: string | null;
  uf: string | null;
  endereco: string | null;
  segmento_icp: string | null;
  porte: string | null;
  capital_social: number | null;
  decisor_nome: string | null;
};

type Perfil = {
  nome_empresa: string | null;
  nome_usuario: string | null;
  tempo_empresa: string | null;
  area_atuacao: string | null;
  produtos_servicos: string | null;
  nichos: string[] | null;
} | null;

type ContatoAlvo = {
  nome: string | null;
  cargo: string | null;
  empresa: string | null;
  linkedin_url: string | null;
};

type CorpoGeracao = {
  companyId?: unknown;
  contatoId?: unknown;
  produto?: unknown;
  objetivo?: unknown;
  canal?: unknown;
};

type CorpoEdicao = {
  id?: unknown;
  assunto?: unknown;
  conteudo?: unknown;
  argumento?: unknown;
};

const ROTULO_OBJETIVO: Record<string, string> = {
  agendar_reuniao: "Agendar reunião",
  descobrir_responsavel: "Descobrir o responsável",
  fazer_diagnostico: "Fazer diagnóstico",
  apresentar_solucao: "Apresentar solução",
  follow_up: "Fazer follow-up",
  reativar_contato: "Reativar contato",
  gerar_interesse: "Gerar interesse",
  outro: "Outro",
};

function instrucoesDeCanal(canal: string): string {
  if (canal === "linkedin") {
    return `CANAL: LinkedIn.
- Mensagem CURTA e conversacional (máximo 70 palavras), como se tivesse sido escrita no celular.
- Nada de assunto, nada de saudação formal longa. Comece direto, humano.
- Proibido tom de template/marketing ("Espero que esteja bem", "Me chamo...").
- Feche com pergunta leve que convide a responder.`;
  }

  if (canal === "whatsapp") {
    return `CANAL: WhatsApp.
- Mensagem MUITO curta (máximo 50 palavras), informal-profissional, brasileira.
- Sem assunto. Sem parágrafos longos. Pode usar uma quebra de linha no máximo.
- Feche com pergunta simples de sim/não ou escolha rápida.`;
  }

  if (canal === "ligacao") {
    return `CANAL: Ligação telefônica — escreva um ROTEIRO DE VOZ com estas seções rotuladas:
- Abertura: 2 frases que despertem atenção sem parecer telemarketing robótico.
- Contexto: por que estou ligando PARA ESTA empresa agora.
- Argumento: o gancho comercial específico.
- Pergunta de descoberta: UMA pergunta aberta sobre a operação deles.
- CTA: pedido claro e pequeno (aceitar continuar a conversa / marcar 15 min).
Máximo 160 palavras no total.`;
  }

  return `CANAL: E-mail de prospecção.
- Gere também um ASSUNTO curto (até 60 caracteres).
- Estrutura: saudação → gancho específico da empresa → argumento ligando o produto à dor → convite leve de 15 minutos.
- Máximo 120 palavras no corpo, sem markdown, sem placeholders entre colchetes.`;
}

function instrucoesSaudacao(
  canal: string,
  decisorNome: string | null,
  nomeAmigavel: string
): string {
  if (canal !== "email") return "";

  if (decisorNome) {
    return `- Comece com "${decisorNome}, bom dia. Tudo bem?" — use EXATAMENTE este nome, é um dado real.`;
  }

  return `- Comece EXATAMENTE com "Olá, time da ${nomeAmigavel}. Tudo bem?" — NÃO invente nomes próprios de pessoa.`;
}

export async function POST(requisicao: Request) {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json({ erro: "Autenticação não configurada." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  let corpo: CorpoGeracao;
  try {
    corpo = (await requisicao.json()) as CorpoGeracao;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const companyId = String(corpo.companyId ?? "");
  const contatoId = String(corpo.contatoId ?? "");
  const produto = String(corpo.produto ?? "").trim();
  const objetivoChave = String(corpo.objetivo ?? "").trim();
  const canal = String(corpo.canal ?? "").trim();

  if (
    (!companyId && !contatoId) ||
    !produto ||
    !objetivoChave ||
    !CANAIS_VALIDOS.has(canal)
  ) {
    return NextResponse.json(
      { erro: "Escolha o produto, o objetivo e o canal antes de gerar." },
      { status: 400 }
    );
  }

  let dadosEmpresa: Empresa | null = null;
  let dadosContato: ContatoAlvo | null = null;

  if (companyId) {
    const { data: empresa } = await supabase
      .from("companies")
      .select(
        "razao_social, nome_fantasia, municipio, uf, endereco, segmento_icp, porte, capital_social, decisor_nome"
      )
      .eq("id", companyId)
      .single();

    if (!empresa) {
      return NextResponse.json({ erro: "Empresa não encontrada." }, { status: 404 });
    }

    dadosEmpresa = empresa as Empresa;
  } else {
    const { data: contato } = await supabase
      .from("contatos")
      .select("nome, cargo, empresa, linkedin_url")
      .eq("id", contatoId)
      .single();

    if (!contato) {
      return NextResponse.json({ erro: "Contato não encontrado." }, { status: 404 });
    }

    dadosContato = contato as ContatoAlvo;
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select(
      "nome_empresa, nome_usuario, tempo_empresa, area_atuacao, produtos_servicos, nichos"
    )
    .eq("usuario_id", user.id)
    .maybeSingle();

  // Créditos de IA: primeira geração cria saldo de boas-vindas.
  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço de créditos indisponível." },
      { status: 503 }
    );
  }

  const { data: creditosAtuais } = await supabase
    .from("creditos_ia")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  let saldo = creditosAtuais?.saldo;

  if (saldo === null || saldo === undefined) {
    const { data: criada, error: erroCriar } = await admin
      .from("creditos_ia")
      .insert({
        usuario_id: user.id,
        saldo: CREDITOS_BOAS_VINDAS,
        atualizado_em: new Date().toISOString(),
      })
      .select("saldo")
      .single();

    if (erroCriar || !criada) {
      return NextResponse.json(
        { erro: "Não foi possível preparar seus Créditos de IA." },
        { status: 500 }
      );
    }
    saldo = criada.saldo;
  }

  if ((saldo ?? 0) < CUSTO_ABORDAGEM) {
    return NextResponse.json(
      { erro: "Você está sem Créditos de IA para gerar abordagens." },
      { status: 402 }
    );
  }

  const dadosPerfil = (perfil ?? null) as Perfil;

  let blocoAlvo = "";
  let nomeParaSaudacao: string | null = null;
  let contextoEmpresaAlvo = "";

  if (dadosEmpresa) {
    const nomeAmigavel =
      dadosEmpresa.nome_fantasia?.replace(/\s*(LTDA|ME|EIRELI|S\/A|SA)\.?$/i, "").trim() ||
      dadosEmpresa.razao_social ||
      "a empresa";

    const localizacao =
      dadosEmpresa.endereco ||
      [dadosEmpresa.municipio, dadosEmpresa.uf].filter(Boolean).join(", ") ||
      "Brasil";

    nomeParaSaudacao = dadosEmpresa.decisor_nome || null;
    contextoEmpresaAlvo = nomeAmigavel;

    blocoAlvo = `EMPRESA-ALVO:
- Nome: ${nomeAmigavel}
- Segmento/atividade: ${dadosEmpresa.segmento_icp || ""}
- Localização: ${localizacao}
${dadosEmpresa.porte ? `- Porte: ${dadosEmpresa.porte}` : ""}
${typeof dadosEmpresa.capital_social === "number" ? `- Capital social: R$ ${dadosEmpresa.capital_social}` : ""}
${dadosEmpresa.decisor_nome ? `- Sócio/decisor identificado: ${dadosEmpresa.decisor_nome}` : ""}`;
  } else if (dadosContato) {
    nomeParaSaudacao = dadosContato.nome || null;

    blocoAlvo = `PESSOA-ALVO (contato encontrado via LinkedIn):
- Nome: ${dadosContato.nome || "não informado"}
- Cargo: ${dadosContato.cargo || "não informado"}
- Empresa onde trabalha: ${dadosContato.empresa || "não informada"}
${dadosContato.linkedin_url ? `- LinkedIn: ${dadosContato.linkedin_url}` : ""}
Trata-se de uma pessoa específica: fale com ELA, no contexto do cargo dela, e adapte o gancho à provável realidade da empresa onde trabalha.`;

    contextoEmpresaAlvo = dadosContato.empresa || "a empresa";
  }

  const portifolioTexto = [
    dadosPerfil?.produtos_servicos ? `O que vendemos: ${dadosPerfil.produtos_servicos}` : "",
    dadosPerfil?.area_atuacao ? `Área de atuação: ${dadosPerfil.area_atuacao}` : "",
    dadosPerfil?.nichos?.length ? `Produtos/serviços confirmados: ${dadosPerfil.nichos.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const instrucaoProduto =
    produto === "__portfolio__"
      ? `PRODUTO A OFERECER: TODO O PORTFÓLIO da nossa empresa (use o contexto abaixo e construa UMA oferta coerente e única — não liste todos os produtos).
${portifolioTexto}`
      : produto === "__outro__" || produto.length > 0
        ? `PRODUTO A OFERECER (escolha do vendedor — argumente por ele mesmo se não estiver no portfólio): ${produto}
${portifolioTexto ? `\nCONTEXTO DO PORTFÓLIO:\n${portifolioTexto}` : ""}`
        : "";

  const objetivoLegivel = ROTULO_OBJETIVO[objetivoChave] ?? objetivoChave;

  const nomeVendedor = dadosPerfil?.nome_usuario?.trim() || null;
  const tempoMercado = dadosPerfil?.tempo_empresa?.trim() || null;
  const areaVendedor = dadosPerfil?.area_atuacao?.trim() || null;

  const apresentacaoVendedor = [
    nomeVendedor
      ? `O vendedor se chama ${nomeVendedor} e representa a empresa ${
          dadosPerfil?.nome_empresa || "representante comercial"
        }.`
      : "",
    areaVendedor ? `A empresa atua no mercado de ${areaVendedor}.` : "",
    tempoMercado ? `Está há mais de ${tempoMercado} nesse mercado.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `QUEM VENDE: ${dadosPerfil?.nome_empresa || "nosso representante comercial"}.
${apresentacaoVendedor ? `${apresentacaoVendedor}\n` : ""}
${instrucaoProduto}

${blocoAlvo}

OBJETIVO DA ABORDAGEM: ${objetivoLegivel}.
Adapte o CTA e o foco ao objetivo (ex.: follow-up retoma contexto; diagnóstico propõe perguntas; apresentar solução mostra aplicação concreta).

${instrucoesDeCanal(canal)}
${instrucoesSaudacao(canal, nomeParaSaudacao, contextoEmpresaAlvo)}

REGRAS DE ESTRUTURA:
1. Logo após a saudação, o PRIMEIRO PARÁGRAFO deve apresentar o remetente no formato natural: "Sou o ${nomeVendedor ?? "[nome]"}, da ${dadosPerfil?.nome_empresa || "[empresa]"}${areaVendedor ? `, que atua no mercado de ${areaVendedor}` : ""}${tempoMercado ? ` há mais de ${tempoMercado}` : ""}." — adapte para soar humano, não engessado.
2. Antes da chamada final, inclua UMA frase consultiva neste espírito: "Inicialmente gostaria de conversar com você para entender seu cenário atual de [segmento/área da empresa-alvo] e ver como podemos ajudar." Use o segmento real do alvo no colchete.

REGRAS DE ARGUMENTAÇÃO:
1. Primeiro identifique o MELHOR ARGUMENTO: UMA conexão específica entre o produto oferecido e a operação real desta empresa (ex.: transportadora refrigerada -> rastreabilidade e continuidade da cadeia fria).
2. Proibido clichês vagos sem ligação direta ("eficiência operacional", "otimizar processos").
3. Não transforme o segmento da empresa-alvo em oferta (alvo frigorífico + vendemos cibersegurança = proteja os sistemas DO frigorífico, nunca "segurança alimentar").
4. Quando houver decisor/pessoa-alvo com nome conhecido, refira-se a ela PELO NOME ao longo do texto, não só na saudação.
5. Português comercial brasileiro, humano, específico.

RESPONDA APENAS COM ESTE JSON:
{"argumento":"o melhor argumento em 1 frase","assunto":"assunto curto ou string vazia para canais sem assunto","conteudo":"a abordagem completa pronta para copiar"}`;

  const respostaIA = await chamarOpenaiJson<{
    argumento?: string;
    assunto?: string;
    conteudo?: string;
  }>(
    "Você é um especialista em prospecção B2B no Brasil e sales copilot. Responda SEMPRE apenas com JSON válido.",
    prompt
  );

  if (!respostaIA?.conteudo) {
    return NextResponse.json(
      { erro: "Não conseguimos gerar a abordagem agora. Tente novamente." },
      { status: 502 }
    );
  }

  // Só debita crédito e salva quando a geração deu certo.
  const novoSaldo = Math.max(0, (saldo ?? 0) - CUSTO_ABORDAGEM);

  await admin
    .from("creditos_ia")
    .update({ saldo: novoSaldo, atualizado_em: new Date().toISOString() })
    .eq("usuario_id", user.id);

  const { data: salva, error: erroSalvar } = await supabase
    .from("abordagens")
    .insert({
      usuario_id: user.id,
      company_id: companyId || null,
      contato_id: contatoId || null,
      produto,
      objetivo: objetivoLegivel,
      canal,
      argumento: respostaIA.argumento ?? null,
      assunto: canal === "email" ? (respostaIA.assunto ?? "") : null,
      conteudo: respostaIA.conteudo,
      creditos_usados: CUSTO_ABORDAGEM,
    })
    .select()
    .single();

  if (erroSalvar || !salva) {
    return NextResponse.json(
      { erro: "A abordagem foi gerada, mas não conseguimos salvá-la." },
      { status: 500 }
    );
  }

  return NextResponse.json({ abordagem: salva, saldoIa: novoSaldo });
}

export async function PUT(requisicao: Request) {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json({ erro: "Autenticação não configurada." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  let corpo: CorpoEdicao;
  try {
    corpo = (await requisicao.json()) as CorpoEdicao;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const id = String(corpo.id ?? "");
  if (!id) {
    return NextResponse.json({ erro: "Abordagem inválida." }, { status: 400 });
  }

  const alteracoes: Record<string, string> = {};

  if (typeof corpo.conteudo === "string" && corpo.conteudo.trim()) {
    alteracoes.conteudo = corpo.conteudo.trim();
  }
  if (typeof corpo.assunto === "string") {
    alteracoes.assunto = corpo.assunto.trim();
  }
  if (typeof corpo.argumento === "string" && corpo.argumento.trim()) {
    alteracoes.argumento = corpo.argumento.trim();
  }

  if (Object.keys(alteracoes).length === 0) {
    return NextResponse.json({ erro: "Nada para salvar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("abordagens")
    .update(alteracoes)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { erro: "Não conseguimos salvar suas edições." },
      { status: 500 }
    );
  }

  return NextResponse.json({ abordagem: data });
}
