import type { Idioma } from "../studio/dicionario";
import type { Moeda } from "../../lib/precos-internacionais";

type Item = { titulo: string; texto: string };
type CartaoFunil = { empresa: string; score: number; prox: string };
type ItensPlano = { itens: string[]; faltam: string[] };

export type TextosPlataforma = {
  local: string;
  moeda: Moeda;
  meta: { titulo: string; descricao: string };
  nav: {
    comoFunciona: string;
    recursos: string;
    planos: string;
    perguntas: string;
    sites: string;
    entrar: string;
    criarConta: string;
    menu: string;
    idioma: string;
  };
  hero: { selo: string; titulo: string; texto: string; cta: string; ctaPlanos: string; nota: string };
  produto: {
    lista: string;
    qtd: string;
    empresa: string;
    local: string;
    score: string;
    justificativa: string;
    aprovadorRotulo: string;
    aprovador: string;
    influenciadorRotulo: string;
    influenciador: string;
    abordagemRotulo: string;
    abordagemNota: string;
    assunto: string;
    corpo: string;
    legenda: string;
  };
  passos: { selo: string; titulo: string; itens: Item[] };
  recursos: { selo: string; titulo: string; itens: Item[] };
  funil: {
    titulo: string;
    cadencia: string;
    colunas: { nome: string; cards: CartaoFunil[] }[];
    legenda: string;
  };
  planos: {
    selo: string;
    titulo: string;
    texto: string;
    porMes: string;
    /** Usa {preco} no lugar do valor. */
    anual: string;
    recomendado: string;
    botao: string;
    nota?: string;
    silver: ItensPlano;
    gold: ItensPlano;
    platinum: ItensPlano;
    internacional?: { titulo: string; texto: string; botao: string };
  };
  perguntas: { selo: string; titulo: string; itens: { pergunta: string; resposta: string }[] };
  cta: { titulo: string; texto: string; botao: string; entrar: string };
  rodape: { descricao: string; termos: string; privacidade: string };
};

const pt: TextosPlataforma = {
  local: "pt-BR",
  moeda: "BRL",
  meta: {
    titulo: "FP Pipe | Prospecção B2B e CRM nas Américas e na Europa",
    descricao:
      "Encontre empresas com o perfil do seu cliente ideal nas Américas e na Europa, saiba quem decide a compra e acompanhe cada oportunidade num CRM com funil, cadência e tarefas.",
  },
  nav: {
    comoFunciona: "Como funciona",
    recursos: "Recursos",
    planos: "Planos",
    perguntas: "Perguntas",
    sites: "Criação de sites",
    entrar: "Entrar",
    criarConta: "Criar conta grátis",
    menu: "Menu",
    idioma: "Idioma",
  },
  hero: {
    selo: "Prospecção B2B + CRM",
    titulo: "Da lista de empresas ao contrato fechado.",
    texto:
      "A FP Pipe encontra empresas com o perfil do seu cliente ideal nas Américas e na Europa, mostra quem decide a compra e leva cada oportunidade para um CRM com funil, cadência e tarefas. Tudo no mesmo lugar.",
    cta: "Criar conta grátis",
    ctaPlanos: "Ver planos",
    nota: "Teste grátis sem cartão · 1 lista com até 25 empresas.",
  },
  produto: {
    lista: "Lista · Frigoríficos MT",
    qtd: "25 empresas",
    empresa: "Frigorífico Boi Forte LTDA",
    local: "Cuiabá/MT · Grande porte",
    score: "score",
    justificativa:
      "Exporta carne bovina e passa por auditorias de origem: encaixa no seu ICP de rastreabilidade industrial.",
    aprovadorRotulo: "Aprovador",
    aprovador: "Diretor de Produção",
    influenciadorRotulo: "Influenciador",
    influenciador: "Gerente de Qualidade",
    abordagemRotulo: "Abordagem inicial",
    abordagemNota: "Você edita antes de enviar",
    assunto: "Assunto: Rastreabilidade de lote no Boi Forte",
    corpo:
      "Olá, time do Boi Forte — frigoríficos que exportam precisam comprovar a origem de cada lote em auditoria. Faz sentido uma conversa rápida?",
    legenda: "Exemplo do produto, com dados fictícios.",
  },
  passos: {
    selo: "Como funciona",
    titulo: "Três passos até a primeira reunião",
    itens: [
      {
        titulo: "Descreva o que você vende",
        texto:
          "Conte sua oferta e anexe o portfólio. O sistema monta o perfil de cliente ideal (ICP): segmentos-alvo, dores e os cargos envolvidos na compra.",
      },
      {
        titulo: "Receba as empresas por aderência",
        texto:
          "Cada empresa recebe um score de 0 a 100, com a justificativa ao lado. A lista já vem na ordem de quem abordar primeiro, no Brasil, nas Américas ou na Europa.",
      },
      {
        titulo: "Aborde e acompanhe no CRM",
        texto:
          "Decisor identificado e primeira abordagem escrita. Com um clique a empresa entra no funil, com responsável, cadência de follow-up e próxima tarefa.",
      },
    ],
  },
  recursos: {
    selo: "Recursos",
    titulo: "Prospecção e CRM, sem trocar de ferramenta.",
    itens: [
      {
        titulo: "Score por empresa, com justificativa",
        texto: "Nota de 0 a 100 e o motivo no mesmo lugar. O time sabe por onde começar, sem lista aleatória.",
      },
      {
        titulo: "Quem decide, por cargo",
        texto: "Aprovador e influenciador da compra identificados. Acabou o e-mail genérico para “empresa”.",
      },
      {
        titulo: "Primeira abordagem já escrita",
        texto: "Cada empresa recebe um texto de abertura. Você ajusta, aprova e envia — nada sai sem revisão.",
      },
      {
        titulo: "Contato comercial verificado",
        texto: "Buscador de contatos, verificação de telefone e dados de várias fontes reunidos em uma ficha.",
      },
      {
        titulo: "CRM com funil, cadência e tarefas",
        texto:
          "Funil de arrastar e soltar, sequências de follow-up automáticas, tarefas do dia e histórico de cada conta. O time vê o que fazer hoje, sem planilha.",
      },
      {
        titulo: "Américas e Europa",
        texto:
          "Busque empresas em países das Américas e da Europa e trabalhe tudo no mesmo funil, com a mesma régua de score.",
      },
    ],
  },
  funil: {
    titulo: "CRM · Funil de prospecção",
    cadencia: "Cadência: Padrão 5 toques",
    colunas: [
      {
        nome: "Novo",
        cards: [
          { empresa: "Laticínios Serra Azul", score: 88, prox: "Enviar e-mail · hoje" },
          { empresa: "Transportes Vale Norte", score: 74, prox: "Sem atividade" },
        ],
      },
      { nome: "Em abordagem", cards: [{ empresa: "Frigorífico Boi Forte", score: 92, prox: "Ligar · amanhã" }] },
      { nome: "Reunião agendada", cards: [{ empresa: "Metalúrgica Aço Sul", score: 81, prox: "Reunião · quinta, 10h" }] },
    ],
    legenda: "O funil do CRM, com a próxima atividade de cada empresa. Dados fictícios.",
  },
  planos: {
    selo: "Planos",
    titulo: "Escolha seu plano",
    texto:
      "O CRM está incluído em todos os planos. No anual o valor por mês sai cerca de 20% menor e fica travado por 12 meses.",
    porMes: "/mês",
    anual: "ou {preco}/mês no plano anual",
    recomendado: "Recomendado",
    botao: "Assinar",
    silver: {
      itens: [
        "250 empresas em listas por mês",
        "Score 0–100 com justificativa",
        "Primeiras abordagens escritas (25/mês)",
        "CRM com funil e cadência",
        "Exportação em CSV",
        "1 usuário",
      ],
      faltam: ["Sem buscador de contatos", "Sem telefones verificados"],
    },
    gold: {
      itens: [
        "400 empresas em listas por mês",
        "Buscador de contatos (até 400 buscas/mês)",
        "50 telefones verificados de decisores",
        "Primeiras abordagens escritas (100/mês)",
        "CRM com funil e cadência",
        "Envio em massa: 100 e-mails/dia",
        "3 usuários",
      ],
      faltam: [],
    },
    platinum: {
      itens: [
        "1.000 empresas em listas por mês",
        "Buscador de contatos (até 1.000 buscas/mês)",
        "100 telefones verificados de decisores",
        "Primeiras abordagens escritas (300/mês)",
        "CRM com funil e cadência",
        "Envio em massa: 300 e-mails/dia",
        "6 usuários",
        "Prioridade na fila de geração",
      ],
      faltam: [],
    },
    internacional: {
      titulo: "Internacional",
      texto: "Para prospectar nas Américas e na Europa, com os países definidos por você. A partir de {preco}/mês no anual.",
      botao: "Ver planos internacionais",
    },
  },
  perguntas: {
    selo: "Perguntas",
    titulo: "Perguntas que ficam no caminho",
    itens: [
      {
        pergunta: "Preciso de cartão para testar?",
        resposta: "Não. A conta de teste inclui 1 lista com até 25 empresas. Cartão só é pedido quando você assina.",
      },
      {
        pergunta: "O CRM é cobrado à parte?",
        resposta:
          "Não. Funil, cadências, tarefas e histórico estão em todos os planos, inclusive no teste. As empresas da lista viram oportunidades com um clique.",
      },
      {
        pergunta: "O que é o score?",
        resposta:
          "Uma nota de 0 a 100 que mede a aderência da empresa ao seu ICP, com a justificativa ao lado de cada nota.",
      },
      {
        pergunta: "Os textos saem prontos para enviar?",
        resposta: "Cada empresa recebe uma abordagem inicial escrita. Você revisa e edita antes de qualquer envio.",
      },
      {
        pergunta: "Funciona fora do Brasil?",
        resposta:
          "Sim. Os planos Internacionais buscam empresas nas Américas e na Europa, nos países que você escolher. O teste grátis já inclui a busca internacional.",
      },
    ],
  },
  cta: {
    titulo: "Sua próxima lista pode sair hoje.",
    texto:
      "No teste você monta uma lista, compara os scores, lê a primeira abordagem e leva as melhores empresas para o funil. Sem cartão.",
    botao: "Criar conta grátis",
    entrar: "Já tem conta? Entrar",
  },
  rodape: {
    descricao: "Prospecção B2B e CRM — da lista ao contrato.",
    termos: "Termos",
    privacidade: "Privacidade",
  },
};

const fr: TextosPlataforma = {
  local: "fr-FR",
  moeda: "EUR",
  meta: {
    titulo: "FP Pipe | Prospection B2B et CRM en Europe et dans les Amériques",
    descricao:
      "Trouvez les entreprises qui correspondent à votre client idéal en Europe et dans les Amériques, identifiez qui décide et suivez chaque opportunité dans un CRM avec pipeline, relances et tâches.",
  },
  nav: {
    comoFunciona: "Fonctionnement",
    recursos: "Fonctionnalités",
    planos: "Tarifs",
    perguntas: "Questions",
    sites: "Création de sites",
    entrar: "Connexion",
    criarConta: "Essai gratuit",
    menu: "Menu",
    idioma: "Langue",
  },
  hero: {
    selo: "Prospection B2B + CRM",
    titulo: "De la liste d’entreprises au contrat signé.",
    texto:
      "FP Pipe trouve les entreprises qui correspondent à votre client idéal, en Europe et dans les Amériques, identifie qui décide et suit chaque opportunité dans un CRM avec pipeline, relances et tâches. Tout au même endroit.",
    cta: "Commencer l’essai gratuit",
    ctaPlanos: "Voir les tarifs",
    nota: "Essai gratuit sans carte · 1 liste de 25 entreprises.",
  },
  produto: {
    lista: "Liste · Laiteries Rhône-Alpes",
    qtd: "25 entreprises",
    empresa: "Laiterie des Aravis SAS",
    local: "Annecy · ETI",
    score: "score",
    justificativa:
      "Exporte ses fromages AOP et passe des audits de traçabilité : correspond à votre client idéal en contrôle qualité industriel.",
    aprovadorRotulo: "Décideur",
    aprovador: "Directeur de production",
    influenciadorRotulo: "Prescripteur",
    influenciador: "Responsable qualité",
    abordagemRotulo: "Premier message",
    abordagemNota: "Vous le modifiez avant l’envoi",
    assunto: "Objet : Traçabilité des lots chez Laiterie des Aravis",
    corpo:
      "Bonjour, les laiteries qui exportent doivent prouver l’origine de chaque lot lors des audits. Seriez-vous disponible pour un court échange ?",
    legenda: "Exemple du produit, avec des données fictives.",
  },
  passos: {
    selo: "Fonctionnement",
    titulo: "Trois étapes jusqu’au premier rendez-vous",
    itens: [
      {
        titulo: "Décrivez ce que vous vendez",
        texto:
          "Présentez votre offre et joignez votre portfolio. Le système construit votre profil client idéal : secteurs cibles, besoins et postes impliqués dans l’achat.",
      },
      {
        titulo: "Recevez les entreprises par pertinence",
        texto:
          "Chaque entreprise reçoit un score de 0 à 100, avec sa justification. La liste arrive déjà triée : vous savez qui contacter en premier.",
      },
      {
        titulo: "Contactez et suivez dans le CRM",
        texto:
          "Décideur identifié, premier message rédigé. En un clic, l’entreprise entre dans le pipeline avec un responsable, une séquence de relances et la prochaine tâche.",
      },
    ],
  },
  recursos: {
    selo: "Fonctionnalités",
    titulo: "Prospection et CRM, sans changer d’outil.",
    itens: [
      {
        titulo: "Un score par entreprise, justifié",
        texto: "Une note de 0 à 100 et sa raison au même endroit. L’équipe sait par où commencer.",
      },
      {
        titulo: "Qui décide, par fonction",
        texto: "Décideur et prescripteur identifiés. Fini les e-mails envoyés à « l’entreprise ».",
      },
      {
        titulo: "Un premier message déjà rédigé",
        texto: "Chaque entreprise reçoit un message d’ouverture. Vous l’ajustez, le validez, l’envoyez — rien ne part sans vous.",
      },
      {
        titulo: "Coordonnées vérifiées",
        texto: "Recherche de contacts, vérification des téléphones et données de plusieurs sources réunies sur une fiche.",
      },
      {
        titulo: "CRM avec pipeline, relances et tâches",
        texto:
          "Pipeline en glisser-déposer, séquences de relance automatiques, tâches du jour et historique de chaque compte. L’équipe sait quoi faire aujourd’hui, sans tableur.",
      },
      {
        titulo: "Europe et Amériques",
        texto:
          "Cherchez des entreprises dans les pays d’Europe et des Amériques et travaillez-les dans le même pipeline, avec le même score.",
      },
    ],
  },
  funil: {
    titulo: "CRM · Pipeline de prospection",
    cadencia: "Séquence : Standard 5 étapes",
    colunas: [
      {
        nome: "Nouveau",
        cards: [
          { empresa: "Fromagerie du Jura", score: 88, prox: "Envoyer un e-mail · aujourd’hui" },
          { empresa: "Transports Garonne", score: 74, prox: "Aucune activité" },
        ],
      },
      { nome: "En contact", cards: [{ empresa: "Laiterie des Aravis", score: 92, prox: "Appeler · demain" }] },
      { nome: "RDV planifié", cards: [{ empresa: "Aciéries de Lorraine", score: 81, prox: "RDV · jeudi, 10 h" }] },
    ],
    legenda: "Le pipeline du CRM, avec la prochaine action pour chaque entreprise. Données fictives.",
  },
  planos: {
    selo: "Tarifs",
    titulo: "Choisissez votre formule",
    texto:
      "Le CRM est inclus dans toutes les formules. En annuel, le prix mensuel baisse d’environ 20 % et reste bloqué pendant 12 mois.",
    porMes: "/mois",
    anual: "ou {preco}/mois en annuel",
    recomendado: "Recommandé",
    botao: "Commencer avec",
    nota: "Prix en euros.",
    silver: {
      itens: [
        "250 entreprises par mois dans vos listes",
        "Score 0–100 justifié",
        "Premiers messages rédigés (25/mois)",
        "CRM avec pipeline et relances",
        "Export CSV",
        "1 utilisateur",
      ],
      faltam: ["Sans recherche de contacts", "Sans téléphones vérifiés"],
    },
    gold: {
      itens: [
        "400 entreprises par mois dans vos listes",
        "Recherche de contacts (jusqu’à 400/mois)",
        "50 téléphones de décideurs vérifiés",
        "Premiers messages rédigés (100/mois)",
        "CRM avec pipeline et relances",
        "Envoi groupé : 100 e-mails/jour",
        "3 utilisateurs",
      ],
      faltam: [],
    },
    platinum: {
      itens: [
        "1 000 entreprises par mois dans vos listes",
        "Recherche de contacts (jusqu’à 1 000/mois)",
        "100 téléphones de décideurs vérifiés",
        "Premiers messages rédigés (300/mois)",
        "CRM avec pipeline et relances",
        "Envoi groupé : 300 e-mails/jour",
        "6 utilisateurs",
        "Priorité de traitement",
      ],
      faltam: [],
    },
  },
  perguntas: {
    selo: "Questions",
    titulo: "Les questions qu’on nous pose",
    itens: [
      {
        pergunta: "Faut-il une carte pour l’essai ?",
        resposta: "Non. L’essai comprend 1 liste de 25 entreprises. La carte n’est demandée qu’à l’abonnement.",
      },
      {
        pergunta: "Le CRM est-il facturé à part ?",
        resposta:
          "Non. Pipeline, relances, tâches et historique sont inclus dans toutes les formules, essai compris. Les entreprises de la liste deviennent des opportunités en un clic.",
      },
      {
        pergunta: "Qu’est-ce que le score ?",
        resposta: "Une note de 0 à 100 qui mesure l’adéquation de l’entreprise à votre client idéal, avec sa justification.",
      },
      {
        pergunta: "Les messages partent-ils automatiquement ?",
        resposta: "Non. Chaque entreprise reçoit un premier message rédigé ; vous le relisez et le modifiez avant tout envoi.",
      },
      {
        pergunta: "Quels pays sont couverts ?",
        resposta: "Les pays d’Europe et des Amériques. Vous choisissez les pays de chaque recherche.",
      },
    ],
  },
  cta: {
    titulo: "Votre prochaine liste peut être prête aujourd’hui.",
    texto:
      "Pendant l’essai, créez une liste, comparez les scores, lisez le premier message et placez les meilleures entreprises dans le pipeline. Sans carte.",
    botao: "Commencer l’essai gratuit",
    entrar: "Déjà client ? Connexion",
  },
  rodape: {
    descricao: "Prospection B2B et CRM — de la liste au contrat.",
    termos: "Conditions",
    privacidade: "Confidentialité",
  },
};

const en: TextosPlataforma = {
  local: "en-US",
  moeda: "USD",
  meta: {
    titulo: "FP Pipe | B2B Prospecting and CRM for the Americas and Europe",
    descricao:
      "Find companies that match your ideal customer across the Americas and Europe, see who makes the decision and track every opportunity in a CRM with pipeline, sequences and tasks.",
  },
  nav: {
    comoFunciona: "How it works",
    recursos: "Features",
    planos: "Pricing",
    perguntas: "FAQ",
    sites: "Web design",
    entrar: "Log in",
    criarConta: "Start free",
    menu: "Menu",
    idioma: "Language",
  },
  hero: {
    selo: "B2B prospecting + CRM",
    titulo: "From a list of companies to a signed deal.",
    texto:
      "FP Pipe finds companies that match your ideal customer across the Americas and Europe, shows who makes the buying decision and moves every opportunity into a CRM with pipeline, sequences and tasks. All in one place.",
    cta: "Start free trial",
    ctaPlanos: "See pricing",
    nota: "Free trial, no card · 1 list of up to 25 companies.",
  },
  produto: {
    lista: "List · Food logistics, Ontario",
    qtd: "25 companies",
    empresa: "Northline Cold Chain Inc.",
    local: "Toronto, ON · Mid-market",
    score: "score",
    justificativa:
      "Ships temperature-sensitive food across borders and goes through traceability audits: fits your ICP for supply-chain compliance.",
    aprovadorRotulo: "Decision maker",
    aprovador: "VP of Operations",
    influenciadorRotulo: "Influencer",
    influenciador: "Quality Manager",
    abordagemRotulo: "First message",
    abordagemNota: "You edit before sending",
    assunto: "Subject: Lot traceability at Northline",
    corpo:
      "Hi Northline team — cold-chain carriers have to prove the origin of every lot during audits. Would a quick call make sense?",
    legenda: "Product example with fictional data.",
  },
  passos: {
    selo: "How it works",
    titulo: "Three steps to your first meeting",
    itens: [
      {
        titulo: "Describe what you sell",
        texto:
          "Tell us about your offer and attach your portfolio. The system builds your ideal customer profile: target industries, pain points and the roles involved in the purchase.",
      },
      {
        titulo: "Get companies ranked by fit",
        texto:
          "Every company gets a 0–100 score with the reasoning next to it. The list arrives sorted, so you know who to contact first.",
      },
      {
        titulo: "Reach out and track it in the CRM",
        texto:
          "Decision maker identified, first message drafted. One click moves the company into the pipeline with an owner, a follow-up sequence and the next task.",
      },
    ],
  },
  recursos: {
    selo: "Features",
    titulo: "Prospecting and CRM, without switching tools.",
    itens: [
      {
        titulo: "A score for every company, explained",
        texto: "A 0–100 rating and the reason behind it, side by side. Your team knows where to start.",
      },
      {
        titulo: "Who decides, by role",
        texto: "Decision maker and influencer identified. No more emails addressed to “the company”.",
      },
      {
        titulo: "A first message, already written",
        texto: "Every company gets an opening message. You adjust it, approve it, send it — nothing goes out without you.",
      },
      {
        titulo: "Verified contact details",
        texto: "Contact finder, phone verification and data from multiple sources gathered on one record.",
      },
      {
        titulo: "CRM with pipeline, sequences and tasks",
        texto:
          "Drag-and-drop pipeline, automatic follow-up sequences, today’s tasks and the full history of every account. Your team knows what to do today — no spreadsheets.",
      },
      {
        titulo: "The Americas and Europe",
        texto:
          "Search for companies across the Americas and Europe and work them in the same pipeline, with the same scoring.",
      },
    ],
  },
  funil: {
    titulo: "CRM · Prospecting pipeline",
    cadencia: "Sequence: Standard 5 touches",
    colunas: [
      {
        nome: "New",
        cards: [
          { empresa: "Blue Ridge Dairy Co.", score: 88, prox: "Send email · today" },
          { empresa: "Great Lakes Freight", score: 74, prox: "No activity" },
        ],
      },
      { nome: "Contacted", cards: [{ empresa: "Northline Cold Chain", score: 92, prox: "Call · tomorrow" }] },
      { nome: "Meeting booked", cards: [{ empresa: "Keystone Steel Works", score: 81, prox: "Meeting · Thu, 10 am" }] },
    ],
    legenda: "The CRM pipeline, with the next activity for each company. Fictional data.",
  },
  planos: {
    selo: "Pricing",
    titulo: "Choose your plan",
    texto:
      "The CRM is included in every plan. Billed annually, the monthly price drops by about 20% and stays locked for 12 months.",
    porMes: "/mo",
    anual: "or {preco}/mo billed annually",
    recomendado: "Recommended",
    botao: "Start with",
    nota: "Prices in US dollars.",
    silver: {
      itens: [
        "250 companies in lists per month",
        "0–100 score with reasoning",
        "Drafted first messages (25/mo)",
        "CRM with pipeline and sequences",
        "CSV export",
        "1 user",
      ],
      faltam: ["No contact finder", "No verified phone numbers"],
    },
    gold: {
      itens: [
        "400 companies in lists per month",
        "Contact finder (up to 400 searches/mo)",
        "50 verified decision-maker phone numbers",
        "Drafted first messages (100/mo)",
        "CRM with pipeline and sequences",
        "Bulk sending: 100 emails/day",
        "3 users",
      ],
      faltam: [],
    },
    platinum: {
      itens: [
        "1,000 companies in lists per month",
        "Contact finder (up to 1,000 searches/mo)",
        "100 verified decision-maker phone numbers",
        "Drafted first messages (300/mo)",
        "CRM with pipeline and sequences",
        "Bulk sending: 300 emails/day",
        "6 users",
        "Priority processing",
      ],
      faltam: [],
    },
  },
  perguntas: {
    selo: "FAQ",
    titulo: "Questions people ask us",
    itens: [
      {
        pergunta: "Do I need a card for the trial?",
        resposta: "No. The trial includes 1 list of up to 25 companies. We only ask for a card when you subscribe.",
      },
      {
        pergunta: "Is the CRM an extra cost?",
        resposta:
          "No. Pipeline, sequences, tasks and history are included in every plan, trial included. Companies from your list become opportunities in one click.",
      },
      {
        pergunta: "What is the score?",
        resposta: "A 0–100 rating of how well a company fits your ideal customer profile, with the reasoning next to it.",
      },
      {
        pergunta: "Are messages sent automatically?",
        resposta: "No. Every company gets a drafted first message; you review and edit it before anything is sent.",
      },
      {
        pergunta: "Which countries are covered?",
        resposta: "Countries across the Americas and Europe. You choose the countries for each search.",
      },
    ],
  },
  cta: {
    titulo: "Your next list can be ready today.",
    texto:
      "In the trial, build a list, compare scores, read the first message and move the best companies into your pipeline. No card required.",
    botao: "Start free trial",
    entrar: "Already a customer? Log in",
  },
  rodape: {
    descricao: "B2B prospecting and CRM — from list to signed deal.",
    termos: "Terms",
    privacidade: "Privacy",
  },
};

const es: TextosPlataforma = {
  local: "es-ES",
  moeda: "EUR",
  meta: {
    titulo: "FP Pipe | Prospección B2B y CRM en Europa y las Américas",
    descricao:
      "Encuentra empresas que encajan con tu cliente ideal en Europa y las Américas, descubre quién decide y sigue cada oportunidad en un CRM con embudo, secuencias y tareas.",
  },
  nav: {
    comoFunciona: "Cómo funciona",
    recursos: "Funciones",
    planos: "Precios",
    perguntas: "Preguntas",
    sites: "Diseño web",
    entrar: "Entrar",
    criarConta: "Prueba gratis",
    menu: "Menú",
    idioma: "Idioma",
  },
  hero: {
    selo: "Prospección B2B + CRM",
    titulo: "De la lista de empresas al contrato firmado.",
    texto:
      "FP Pipe encuentra empresas que encajan con tu cliente ideal en Europa y las Américas, identifica quién decide la compra y lleva cada oportunidad a un CRM con embudo, secuencias y tareas. Todo en un mismo lugar.",
    cta: "Empezar prueba gratis",
    ctaPlanos: "Ver precios",
    nota: "Prueba gratis sin tarjeta · 1 lista de hasta 25 empresas.",
  },
  produto: {
    lista: "Lista · Conserveras del Cantábrico",
    qtd: "25 empresas",
    empresa: "Conservas Costa Norte S.L.",
    local: "Santander · Mediana empresa",
    score: "score",
    justificativa:
      "Exporta conservas de pescado y pasa auditorías de trazabilidad: encaja con tu cliente ideal en control de calidad industrial.",
    aprovadorRotulo: "Decisor",
    aprovador: "Director de Producción",
    influenciadorRotulo: "Influenciador",
    influenciador: "Responsable de Calidad",
    abordagemRotulo: "Primer mensaje",
    abordagemNota: "Lo editas antes de enviar",
    assunto: "Asunto: Trazabilidad de lotes en Costa Norte",
    corpo:
      "Hola, equipo de Costa Norte: las conserveras que exportan deben demostrar el origen de cada lote en las auditorías. ¿Tendría sentido una llamada breve?",
    legenda: "Ejemplo del producto, con datos ficticios.",
  },
  passos: {
    selo: "Cómo funciona",
    titulo: "Tres pasos hasta la primera reunión",
    itens: [
      {
        titulo: "Describe lo que vendes",
        texto:
          "Cuenta tu oferta y adjunta tu portafolio. El sistema crea tu perfil de cliente ideal: sectores objetivo, necesidades y cargos que participan en la compra.",
      },
      {
        titulo: "Recibe empresas por afinidad",
        texto:
          "Cada empresa recibe un score de 0 a 100 con su justificación. La lista llega ordenada: sabes a quién contactar primero.",
      },
      {
        titulo: "Contacta y haz seguimiento en el CRM",
        texto:
          "Decisor identificado y primer mensaje redactado. Con un clic la empresa entra en el embudo con responsable, secuencia de seguimiento y próxima tarea.",
      },
    ],
  },
  recursos: {
    selo: "Funciones",
    titulo: "Prospección y CRM, sin cambiar de herramienta.",
    itens: [
      {
        titulo: "Un score por empresa, justificado",
        texto: "Nota de 0 a 100 y el motivo en el mismo lugar. El equipo sabe por dónde empezar.",
      },
      {
        titulo: "Quién decide, por cargo",
        texto: "Decisor e influenciador identificados. Se acabaron los correos dirigidos a «la empresa».",
      },
      {
        titulo: "Primer mensaje ya redactado",
        texto: "Cada empresa recibe un mensaje de apertura. Lo ajustas, lo apruebas y lo envías: nada sale sin ti.",
      },
      {
        titulo: "Datos de contacto verificados",
        texto: "Buscador de contactos, verificación de teléfonos y datos de varias fuentes reunidos en una ficha.",
      },
      {
        titulo: "CRM con embudo, secuencias y tareas",
        texto:
          "Embudo de arrastrar y soltar, secuencias de seguimiento automáticas, tareas del día e historial de cada cuenta. El equipo sabe qué hacer hoy, sin hojas de cálculo.",
      },
      {
        titulo: "Europa y las Américas",
        texto: "Busca empresas en países de Europa y las Américas y trabájalas en el mismo embudo, con el mismo score.",
      },
    ],
  },
  funil: {
    titulo: "CRM · Embudo de prospección",
    cadencia: "Secuencia: Estándar 5 pasos",
    colunas: [
      {
        nome: "Nuevo",
        cards: [
          { empresa: "Lácteos Sierra de Gredos", score: 88, prox: "Enviar correo · hoy" },
          { empresa: "Transportes del Ebro", score: 74, prox: "Sin actividad" },
        ],
      },
      { nome: "En contacto", cards: [{ empresa: "Conservas Costa Norte", score: 92, prox: "Llamar · mañana" }] },
      { nome: "Reunión agendada", cards: [{ empresa: "Aceros del Nervión", score: 81, prox: "Reunión · jueves, 10 h" }] },
    ],
    legenda: "El embudo del CRM, con la próxima actividad de cada empresa. Datos ficticios.",
  },
  planos: {
    selo: "Precios",
    titulo: "Elige tu plan",
    texto:
      "El CRM está incluido en todos los planes. En el plan anual el precio mensual baja cerca de un 20 % y queda fijo durante 12 meses.",
    porMes: "/mes",
    anual: "o {preco}/mes en el plan anual",
    recomendado: "Recomendado",
    botao: "Empezar con",
    nota: "Precios en euros.",
    silver: {
      itens: [
        "250 empresas al mes en listas",
        "Score 0–100 con justificación",
        "Primeros mensajes redactados (25/mes)",
        "CRM con embudo y secuencias",
        "Exportación CSV",
        "1 usuario",
      ],
      faltam: ["Sin buscador de contactos", "Sin teléfonos verificados"],
    },
    gold: {
      itens: [
        "400 empresas al mes en listas",
        "Buscador de contactos (hasta 400/mes)",
        "50 teléfonos de decisores verificados",
        "Primeros mensajes redactados (100/mes)",
        "CRM con embudo y secuencias",
        "Envío masivo: 100 correos/día",
        "3 usuarios",
      ],
      faltam: [],
    },
    platinum: {
      itens: [
        "1.000 empresas al mes en listas",
        "Buscador de contactos (hasta 1.000/mes)",
        "100 teléfonos de decisores verificados",
        "Primeros mensajes redactados (300/mes)",
        "CRM con embudo y secuencias",
        "Envío masivo: 300 correos/día",
        "6 usuarios",
        "Prioridad de procesamiento",
      ],
      faltam: [],
    },
  },
  perguntas: {
    selo: "Preguntas",
    titulo: "Lo que suelen preguntarnos",
    itens: [
      {
        pergunta: "¿Necesito tarjeta para la prueba?",
        resposta: "No. La prueba incluye 1 lista de hasta 25 empresas. Solo pedimos tarjeta al suscribirte.",
      },
      {
        pergunta: "¿El CRM se paga aparte?",
        resposta:
          "No. Embudo, secuencias, tareas e historial están en todos los planes, incluida la prueba. Las empresas de la lista pasan a ser oportunidades con un clic.",
      },
      {
        pergunta: "¿Qué es el score?",
        resposta: "Una nota de 0 a 100 que mide cuánto encaja la empresa con tu cliente ideal, con su justificación.",
      },
      {
        pergunta: "¿Los mensajes se envían solos?",
        resposta: "No. Cada empresa recibe un primer mensaje redactado; lo revisas y editas antes de cualquier envío.",
      },
      {
        pergunta: "¿Qué países cubre?",
        resposta: "Países de Europa y las Américas. Tú eliges los países de cada búsqueda.",
      },
    ],
  },
  cta: {
    titulo: "Tu próxima lista puede estar lista hoy.",
    texto:
      "En la prueba creas una lista, comparas los scores, lees el primer mensaje y llevas las mejores empresas al embudo. Sin tarjeta.",
    botao: "Empezar prueba gratis",
    entrar: "¿Ya eres cliente? Entrar",
  },
  rodape: {
    descricao: "Prospección B2B y CRM: de la lista al contrato.",
    termos: "Condiciones",
    privacidade: "Privacidad",
  },
};

export const TEXTOS_PLATAFORMA: Record<Idioma, TextosPlataforma> = { pt, fr, en, es };
