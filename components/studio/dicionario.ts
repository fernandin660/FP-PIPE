export const IDIOMAS = ["fr", "en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export function ehIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

export const DPO = {
  nome: "Fernando Pugliesi",
  email: "fernandopugliesi@fppipe.com.br",
};

export const CONTATO = {
  telefone: "+33745064279",
  telefoneVisivel: "+33 7 45 06 42 79",
  // Preencher com o @ da página (ex.: "https://www.instagram.com/fppipe").
  instagram: "https://www.instagram.com/fppipe/",
};

type Item = { titulo: string; texto: string };

export type Dicionario = {
  meta: { titulo: string; descricao: string };
  nav: {
    servicos: string;
    metodo: string;
    projetos: string;
    estudio: string;
    contato: string;
    idioma: string;
  };
  hero: {
    selo: string;
    atos: { titulo: string; texto: string }[];
    rolar: string;
    ctaPrincipal: string;
    ctaFpPipe: string;
  };
  servicos: { selo: string; titulo: string; itens: Item[] };
  metodo: { selo: string; titulo: string; passos: Item[] };
  conceitos: {
    selo: string;
    titulo: string;
    aviso: string;
    prototipo: { etiqueta: string; setor: string; frase: string; menu: string[]; botao: string; abrir: string };
    etiqueta: string;
    projetos: { nome: string; setor: string; frase: string; menu: string[]; botao: string }[];
  };
  cookies: { titulo: string; texto: string; aceitar: string; recusar: string; saberMais: string; gerenciar: string };
  privacidade: {
    titulo: string;
    atualizado: string;
    intro: string;
    secoes: { titulo: string; texto?: string; itens?: string[] }[];
  };
  estudio: {
    selo: string;
    titulo: string;
    paragrafos: string[];
    legendaFoto: string;
  };
  ponte: { titulo: string; texto: string; botao: string; nota: string };
  contato: {
    selo: string;
    titulo: string;
    texto: string;
    campos: {
      nome: string;
      empresa: string;
      email: string;
      telefone: string;
      mensagem: string;
      opcional: string;
    };
    enviar: string;
    enviando: string;
    sucesso: string;
    erro: string;
    direto: string;
    sms: string;
    smsTexto: string;
    ligar: string;
    instagram: string;
    rgpd: string;
  };
  rodape: { direitos: string; mentions: string; privacidade: string };
  mentions: {
    titulo: string;
    voltar: string;
    secoes: { titulo: string; texto: string }[];
  };
};

const fr: Dicionario = {
  meta: {
    titulo: "FP Pipe Studio — Création de sites web pour entreprises",
    descricao:
      "Sites vitrines, landing pages et refontes sur mesure, pensés pour le mobile et pour faire venir des clients. Studio franco-brésilien, interlocutrice en France.",
  },
  nav: {
    servicos: "Services",
    metodo: "Méthode",
    projetos: "Projets",
    estudio: "Studio",
    contato: "Contact",
    idioma: "Langue",
  },
  hero: {
    selo: "Studio web — France · Brésil",
    atos: [
      {
        titulo: "Sur internet, tout le monde fait du bruit.",
        texto: "Votre entreprise mérite qu’on la remarque.",
      },
      {
        titulo: "Nous concevons des sites qui sortent du lot.",
        texto: "Sur mesure, rapides, pensés d’abord pour le mobile.",
      },
      {
        titulo: "Et qui font venir des clients.",
        texto:
          "Avec FP Pipe, notre logiciel de prospection, votre site devient le début d’une relation commerciale.",
      },
    ],
    rolar: "Faites défiler",
    ctaPrincipal: "Parlons de votre projet",
    ctaFpPipe: "Découvrir FP Pipe",
  },
  servicos: {
    selo: "Services",
    titulo: "Ce que nous créons",
    itens: [
      {
        titulo: "Site vitrine",
        texto: "Présentez votre entreprise avec clarté et donnez envie de vous contacter.",
      },
      {
        titulo: "Landing page",
        texto: "Une page unique, pensée pour une offre et une seule action : convertir.",
      },
      {
        titulo: "Refonte de site",
        texto: "Votre site existe mais ne vous ressemble plus ? On le reprend de zéro.",
      },
      {
        titulo: "Site multilingue",
        texto: "Français, anglais, espagnol, portugais : parlez à vos clients dans leur langue.",
      },
    ],
  },
  metodo: {
    selo: "Méthode",
    titulo: "Comment ça se passe",
    passos: [
      {
        titulo: "Échange",
        texto: "On comprend votre activité, vos clients et ce que le site doit accomplir.",
      },
      {
        titulo: "Maquette",
        texto: "Vous voyez votre site avant qu’il soit construit, et on ajuste ensemble.",
      },
      {
        titulo: "Développement",
        texto: "Un site rapide, adapté à tous les écrans et prêt pour Google.",
      },
      {
        titulo: "Mise en ligne",
        texto: "On publie, on vous forme si besoin, et on reste disponibles ensuite.",
      },
    ],
  },
  conceitos: {
    selo: "Projets",
    titulo: "Nos réalisations",
    aviso:
      "Un prototype navigable et deux projets concept qui montrent notre approche. Les projets concept ne sont pas des clients réels.",
    prototipo: {
      etiqueta: "Prototype",
      setor: "Lieu de mariage · Occitanie",
      frase: "Dites oui au milieu des vignes.",
      menu: ["Mariages", "Le domaine", "Hébergement", "Vins"],
      botao: "Organiser votre mariage",
      abrir: "Voir le prototype",
    },
    etiqueta: "Projet concept",
    projetos: [
      {
        nome: "Lucette",
        setor: "Bistrot · Paris 11e",
        frase: "Cuisine de marché, vins vivants.",
        menu: ["La carte", "Le lieu", "Réserver"],
        botao: "Réserver une table",
      },
      {
        nome: "Studio Halde",
        setor: "Architecture d’intérieur · Lyon",
        frase: "Des intérieurs calmes, pensés pour durer.",
        menu: ["Projets", "Studio", "Contact"],
        botao: "Prendre rendez-vous",
      },
    ],
  },
  estudio: {
    selo: "Studio",
    titulo: "Un studio franco-brésilien.",
    paragrafos: [
      "Nous sommes Fernando et Larissa. Fernando conçoit et développe les sites ; Larissa, installée en France, est votre interlocutrice : même langue, même fuseau horaire.",
      "Nous développons aussi FP Pipe, notre propre logiciel de prospection B2B, déjà utilisé par des entreprises au Brésil. Nous savons faire un beau site — et nous savons aussi ce qu’il faut pour qu’il rapporte.",
    ],
    legendaFoto: "Fernando et Larissa, à Paris.",
  },
  ponte: {
    titulo: "Un site, c’est le début. Les clients, c’est la suite.",
    texto:
      "FP Pipe trouve les entreprises qui correspondent à votre client idéal, identifie qui décide et prépare un premier message.",
    botao: "Découvrir FP Pipe",
    nota: "Site en portugais",
  },
  contato: {
    selo: "Contact",
    titulo: "Parlons de votre projet.",
    texto: "Racontez-nous en quelques lignes. On vous répond rapidement.",
    campos: {
      nome: "Nom",
      empresa: "Entreprise",
      email: "E-mail",
      telefone: "Téléphone",
      mensagem: "Votre projet",
      opcional: "facultatif",
    },
    enviar: "Envoyer",
    enviando: "Envoi…",
    sucesso: "Merci ! Votre message est bien arrivé. On revient vers vous très vite.",
    erro: "L’envoi n’a pas fonctionné. Réessayez ou écrivez-nous par SMS.",
    direto: "Vous préférez écrire directement ?",
    sms: "Envoyer un SMS",
    smsTexto: "Bonjour Larissa, j’aimerais parler d’un projet de site.",
    ligar: "Appeler",
    instagram: "Instagram",
    rgpd: "Vos informations servent uniquement à vous répondre. Elles ne sont jamais revendues.",
  },
  cookies: {
    titulo: "Cookies",
    texto:
      "Nous utilisons uniquement les cookies indispensables au fonctionnement du site. Aucun cookie publicitaire ou de suivi n’est déposé sans votre accord.",
    aceitar: "Accepter",
    recusar: "Refuser",
    saberMais: "Politique de confidentialité",
    gerenciar: "Gérer les cookies",
  },
  privacidade: {
    titulo: "Politique de confidentialité",
    atualizado: "Dernière mise à jour : 10 novembre 2026",
    intro:
      "Cette politique explique quelles données personnelles nous traitons sur ce site, pourquoi, pendant combien de temps et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD).",
    secoes: [
      {
        titulo: "Responsable du traitement",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Contact : ${DPO.email}.`,
      },
      {
        titulo: "Délégué à la protection des données (DPO)",
        texto: `${DPO.nome} — ${DPO.email}. Pour toute question sur vos données ou pour exercer vos droits, écrivez au DPO.`,
      },
      {
        titulo: "Données collectées",
        itens: [
          "Formulaire de contact : nom, entreprise (facultatif), e-mail, téléphone (facultatif) et le message que vous écrivez.",
          "Données techniques : adresse IP, utilisée brièvement pour protéger le formulaire contre les abus, puis supprimée automatiquement.",
          "Choix concernant les cookies : enregistré dans votre navigateur uniquement.",
        ],
      },
      {
        titulo: "Finalités et bases légales",
        itens: [
          "Répondre à votre demande et préparer une proposition : mesures précontractuelles prises à votre demande (art. 6.1.b RGPD).",
          "Sécuriser le site et éviter les envois automatisés : intérêt légitime (art. 6.1.f RGPD).",
        ],
      },
      {
        titulo: "Destinataires et sous-traitants",
        texto:
          "Vos données ne sont ni vendues ni louées. Elles sont accessibles uniquement à l’équipe FP Pipe et à nos prestataires techniques : Vercel (hébergement du site), Resend (envoi des e-mails du formulaire) et Supabase (base de données de sécurité).",
      },
      {
        titulo: "Transferts hors de l’Union européenne",
        texto:
          "Ces prestataires peuvent traiter des données aux États-Unis. Ces transferts sont encadrés par le Data Privacy Framework UE–États-Unis ou par les clauses contractuelles types de la Commission européenne.",
      },
      {
        titulo: "Durée de conservation",
        itens: [
          "Demandes de contact : 3 ans à compter du dernier échange, puis suppression.",
          "Adresse IP de sécurité : quelques minutes.",
          "Choix concernant les cookies : 6 mois, puis nous vous redemandons.",
        ],
      },
      {
        titulo: "Vos droits",
        texto: `Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, et vous opposer à leur traitement, en écrivant à ${DPO.email}. Nous répondons dans un délai d’un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
      },
      {
        titulo: "Cookies",
        texto:
          "Ce site ne dépose aucun cookie publicitaire ni de mesure d’audience. Seuls des éléments techniques nécessaires à son fonctionnement peuvent être utilisés ; ils ne nécessitent pas de consentement. Les polices et images sont servies depuis nos propres serveurs : votre navigateur ne se connecte pas à Google ni à d’autres services tiers. Vous pouvez modifier votre choix à tout moment via « Gérer les cookies » en bas de page.",
      },
    ],
  },
  rodape: { direitos: "Tous droits réservés.", mentions: "Mentions légales", privacidade: "Confidentialité" },
  mentions: {
    titulo: "Mentions légales",
    voltar: "Retour au site",
    secoes: [
      {
        titulo: "Éditeur",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Directeur de la publication : ${DPO.nome}. Contact : ${DPO.email} · +33 7 45 06 42 79.`,
      },
      {
        titulo: "Hébergement",
        texto: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.",
      },
      {
        titulo: "Données personnelles",
        texto:
          "Les informations envoyées via le formulaire servent uniquement à répondre à votre demande et ne sont jamais revendues. Conformément au RGPD, vous pouvez demander leur consultation ou leur suppression à tout moment en nous contactant.",
      },
      {
        titulo: "Cookies",
        texto:
          "Ce site n’utilise pas de cookies publicitaires ni de suivi. Seuls des cookies techniques nécessaires au fonctionnement peuvent être utilisés.",
      },
    ],
  },
};

const en: Dicionario = {
  meta: {
    titulo: "FP Pipe Studio — Websites for businesses",
    descricao:
      "Custom websites, landing pages and redesigns, built mobile-first to bring in clients. A French-Brazilian studio with a contact in France.",
  },
  nav: {
    servicos: "Services",
    metodo: "Process",
    projetos: "Projects",
    estudio: "Studio",
    contato: "Contact",
    idioma: "Language",
  },
  hero: {
    selo: "Web studio — France · Brazil",
    atos: [
      {
        titulo: "Online, everyone is making noise.",
        texto: "Your business deserves to be noticed.",
      },
      {
        titulo: "We design websites that stand out.",
        texto: "Custom-made, fast, and built for mobile first.",
      },
      {
        titulo: "And bring in clients.",
        texto:
          "With FP Pipe, our prospecting software, your website becomes the start of a business relationship.",
      },
    ],
    rolar: "Scroll",
    ctaPrincipal: "Let’s talk about your project",
    ctaFpPipe: "Discover FP Pipe",
  },
  servicos: {
    selo: "Services",
    titulo: "What we build",
    itens: [
      {
        titulo: "Business website",
        texto: "Present your company clearly and make people want to get in touch.",
      },
      {
        titulo: "Landing page",
        texto: "One page, one offer, one action: convert.",
      },
      {
        titulo: "Website redesign",
        texto: "Your site no longer looks like you? We rebuild it from scratch.",
      },
      {
        titulo: "Multilingual website",
        texto: "French, English, Spanish, Portuguese: speak to clients in their language.",
      },
    ],
  },
  metodo: {
    selo: "Process",
    titulo: "How it works",
    passos: [
      {
        titulo: "Conversation",
        texto: "We learn about your business, your clients and what the site must achieve.",
      },
      {
        titulo: "Mockup",
        texto: "You see your site before it’s built, and we refine it together.",
      },
      {
        titulo: "Development",
        texto: "A fast site that works on every screen and is ready for Google.",
      },
      {
        titulo: "Launch",
        texto: "We publish it, show you the ropes if needed, and stay available afterwards.",
      },
    ],
  },
  conceitos: {
    selo: "Projects",
    titulo: "Our work",
    aviso:
      "One clickable prototype and two concept projects that show our approach. Concept projects are not real clients.",
    prototipo: {
      etiqueta: "Prototype",
      setor: "Wedding venue · Occitanie",
      frase: "Say yes among the vines.",
      menu: ["Weddings", "The estate", "Stay", "Wines"],
      botao: "Plan your wedding",
      abrir: "View the prototype",
    },
    etiqueta: "Concept project",
    projetos: [
      {
        nome: "Lucette",
        setor: "Bistro · Paris 11th",
        frase: "Market cooking, natural wines.",
        menu: ["Menu", "The place", "Book"],
        botao: "Book a table",
      },
      {
        nome: "Studio Halde",
        setor: "Interior architecture · Lyon",
        frase: "Calm interiors, made to last.",
        menu: ["Projects", "Studio", "Contact"],
        botao: "Book a meeting",
      },
    ],
  },
  estudio: {
    selo: "Studio",
    titulo: "A French-Brazilian studio.",
    paragrafos: [
      "We are Fernando and Larissa. Fernando designs and builds the websites; Larissa, based in France, is your point of contact — same language, same time zone.",
      "We also build FP Pipe, our own B2B prospecting software, already used by companies in Brazil. We know how to make a beautiful website — and what it takes for it to pay off.",
    ],
    legendaFoto: "Fernando and Larissa, in Paris.",
  },
  ponte: {
    titulo: "A website is the beginning. Clients come next.",
    texto:
      "FP Pipe finds companies that match your ideal client, identifies who decides, and drafts a first message.",
    botao: "Discover FP Pipe",
    nota: "Site in Portuguese",
  },
  contato: {
    selo: "Contact",
    titulo: "Let’s talk about your project.",
    texto: "Tell us in a few lines. We’ll get back to you quickly.",
    campos: {
      nome: "Name",
      empresa: "Company",
      email: "Email",
      telefone: "Phone",
      mensagem: "Your project",
      opcional: "optional",
    },
    enviar: "Send",
    enviando: "Sending…",
    sucesso: "Thank you! Your message arrived. We’ll get back to you very soon.",
    erro: "Sending failed. Please try again or text us.",
    direto: "Prefer to write directly?",
    sms: "Send a text",
    smsTexto: "Hi Larissa, I’d like to talk about a website project.",
    ligar: "Call",
    instagram: "Instagram",
    rgpd: "Your details are only used to reply to you. They are never sold.",
  },
  cookies: {
    titulo: "Cookies",
    texto:
      "We only use cookies that are essential for the site to work. No advertising or tracking cookies are set without your consent.",
    aceitar: "Accept",
    recusar: "Decline",
    saberMais: "Privacy policy",
    gerenciar: "Manage cookies",
  },
  privacidade: {
    titulo: "Privacy policy",
    atualizado: "Last updated: 10 November 2026",
    intro:
      "This policy explains which personal data we process on this site, why, for how long, and how to exercise your rights under the General Data Protection Regulation (GDPR).",
    secoes: [
      {
        titulo: "Data controller",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Contact: ${DPO.email}.`,
      },
      {
        titulo: "Data Protection Officer (DPO)",
        texto: `${DPO.nome} — ${DPO.email}. For any question about your data or to exercise your rights, write to the DPO.`,
      },
      {
        titulo: "Data we collect",
        itens: [
          "Contact form: name, company (optional), email, phone (optional) and the message you write.",
          "Technical data: IP address, used briefly to protect the form from abuse, then deleted automatically.",
          "Your cookie choice: stored in your browser only.",
        ],
      },
      {
        titulo: "Purposes and legal bases",
        itens: [
          "Answering your request and preparing a proposal: pre-contractual steps taken at your request (Art. 6(1)(b) GDPR).",
          "Securing the site and preventing automated submissions: legitimate interest (Art. 6(1)(f) GDPR).",
        ],
      },
      {
        titulo: "Recipients and processors",
        texto:
          "Your data is never sold or rented. Only the FP Pipe team and our technical providers can access it: Vercel (website hosting), Resend (sending form emails) and Supabase (security database).",
      },
      {
        titulo: "Transfers outside the European Union",
        texto:
          "These providers may process data in the United States. Such transfers rely on the EU–US Data Privacy Framework or the European Commission’s standard contractual clauses.",
      },
      {
        titulo: "Retention",
        itens: [
          "Contact requests: 3 years after our last exchange, then deleted.",
          "Security IP address: a few minutes.",
          "Your cookie choice: 6 months, after which we ask again.",
        ],
      },
      {
        titulo: "Your rights",
        texto: `You can request access to, correction, deletion, restriction or portability of your data, and object to its processing, by writing to ${DPO.email}. We reply within one month. If you believe your rights are not respected, you can lodge a complaint with your data protection authority (in France, the CNIL — www.cnil.fr).`,
      },
      {
        titulo: "Cookies",
        texto:
          "This site sets no advertising or audience-measurement cookies. Only technical elements needed for it to work may be used; they do not require consent. Fonts and images are served from our own servers: your browser does not connect to Google or other third-party services. You can change your choice at any time via “Manage cookies” at the bottom of the page.",
      },
    ],
  },
  rodape: { direitos: "All rights reserved.", mentions: "Legal notice", privacidade: "Privacy" },
  mentions: {
    titulo: "Legal notice",
    voltar: "Back to the site",
    secoes: [
      {
        titulo: "Publisher",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Publication director: ${DPO.nome}. Contact: ${DPO.email} · +33 7 45 06 42 79.`,
      },
      {
        titulo: "Hosting",
        texto: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States.",
      },
      {
        titulo: "Personal data",
        texto:
          "Information sent through the form is only used to answer your request and is never sold. Under the GDPR, you can ask to access or delete it at any time by contacting us.",
      },
      {
        titulo: "Cookies",
        texto:
          "This site uses no advertising or tracking cookies. Only technical cookies needed for it to work may be used.",
      },
    ],
  },
};

const es: Dicionario = {
  meta: {
    titulo: "FP Pipe Studio — Sitios web para empresas",
    descricao:
      "Sitios web, landing pages y rediseños a medida, pensados para móvil y para atraer clientes. Estudio franco-brasileño con contacto en Francia.",
  },
  nav: {
    servicos: "Servicios",
    metodo: "Método",
    projetos: "Proyectos",
    estudio: "Estudio",
    contato: "Contacto",
    idioma: "Idioma",
  },
  hero: {
    selo: "Estudio web — Francia · Brasil",
    atos: [
      {
        titulo: "En internet, todos hacen ruido.",
        texto: "Tu empresa merece que la noten.",
      },
      {
        titulo: "Diseñamos sitios que destacan.",
        texto: "A medida, rápidos y pensados primero para el móvil.",
      },
      {
        titulo: "Y que atraen clientes.",
        texto:
          "Con FP Pipe, nuestro software de prospección, tu sitio se convierte en el inicio de una relación comercial.",
      },
    ],
    rolar: "Desliza",
    ctaPrincipal: "Hablemos de tu proyecto",
    ctaFpPipe: "Conocer FP Pipe",
  },
  servicos: {
    selo: "Servicios",
    titulo: "Lo que creamos",
    itens: [
      {
        titulo: "Sitio corporativo",
        texto: "Presenta tu empresa con claridad y da ganas de contactarte.",
      },
      {
        titulo: "Landing page",
        texto: "Una página, una oferta y una sola acción: convertir.",
      },
      {
        titulo: "Rediseño web",
        texto: "¿Tu sitio ya no se parece a ti? Lo rehacemos desde cero.",
      },
      {
        titulo: "Sitio multilingüe",
        texto: "Francés, inglés, español, portugués: habla a tus clientes en su idioma.",
      },
    ],
  },
  metodo: {
    selo: "Método",
    titulo: "Cómo trabajamos",
    passos: [
      {
        titulo: "Conversación",
        texto: "Entendemos tu negocio, tus clientes y lo que el sitio debe lograr.",
      },
      {
        titulo: "Maqueta",
        texto: "Ves tu sitio antes de construirlo y lo ajustamos juntos.",
      },
      {
        titulo: "Desarrollo",
        texto: "Un sitio rápido, adaptado a todas las pantallas y listo para Google.",
      },
      {
        titulo: "Lanzamiento",
        texto: "Lo publicamos, te enseñamos a usarlo si hace falta y seguimos disponibles.",
      },
    ],
  },
  conceitos: {
    selo: "Proyectos",
    titulo: "Nuestro trabajo",
    aviso:
      "Un prototipo navegable y dos proyectos concepto que muestran nuestro enfoque. Los proyectos concepto no son clientes reales.",
    prototipo: {
      etiqueta: "Prototipo",
      setor: "Lugar de bodas · Occitania",
      frase: "Di sí entre los viñedos.",
      menu: ["Bodas", "La finca", "Alojamiento", "Vinos"],
      botao: "Organiza tu boda",
      abrir: "Ver el prototipo",
    },
    etiqueta: "Proyecto concepto",
    projetos: [
      {
        nome: "Lucette",
        setor: "Bistró · París 11",
        frase: "Cocina de mercado, vinos naturales.",
        menu: ["La carta", "El local", "Reservar"],
        botao: "Reservar mesa",
      },
      {
        nome: "Studio Halde",
        setor: "Interiorismo · Lyon",
        frase: "Interiores serenos, pensados para durar.",
        menu: ["Proyectos", "Estudio", "Contacto"],
        botao: "Pedir cita",
      },
    ],
  },
  estudio: {
    selo: "Estudio",
    titulo: "Un estudio franco-brasileño.",
    paragrafos: [
      "Somos Fernando y Larissa. Fernando diseña y desarrolla los sitios; Larissa, en Francia, es tu contacto: mismo idioma, misma zona horaria.",
      "También desarrollamos FP Pipe, nuestro propio software de prospección B2B, ya utilizado por empresas en Brasil. Sabemos hacer un sitio bonito — y sabemos lo que hace falta para que sea rentable.",
    ],
    legendaFoto: "Fernando y Larissa, en París.",
  },
  ponte: {
    titulo: "Un sitio es el comienzo. Los clientes vienen después.",
    texto:
      "FP Pipe encuentra empresas que encajan con tu cliente ideal, identifica quién decide y prepara un primer mensaje.",
    botao: "Conocer FP Pipe",
    nota: "Sitio en portugués",
  },
  contato: {
    selo: "Contacto",
    titulo: "Hablemos de tu proyecto.",
    texto: "Cuéntanos en pocas líneas. Te respondemos pronto.",
    campos: {
      nome: "Nombre",
      empresa: "Empresa",
      email: "Correo",
      telefone: "Teléfono",
      mensagem: "Tu proyecto",
      opcional: "opcional",
    },
    enviar: "Enviar",
    enviando: "Enviando…",
    sucesso: "¡Gracias! Tu mensaje ha llegado. Te responderemos muy pronto.",
    erro: "No se pudo enviar. Inténtalo de nuevo o escríbenos por SMS.",
    direto: "¿Prefieres escribir directamente?",
    sms: "Enviar un SMS",
    smsTexto: "Hola Larissa, me gustaría hablar de un proyecto web.",
    ligar: "Llamar",
    instagram: "Instagram",
    rgpd: "Tus datos solo se usan para responderte. Nunca se venden.",
  },
  cookies: {
    titulo: "Cookies",
    texto:
      "Solo usamos las cookies imprescindibles para que el sitio funcione. No se instala ninguna cookie publicitaria o de seguimiento sin tu consentimiento.",
    aceitar: "Aceptar",
    recusar: "Rechazar",
    saberMais: "Política de privacidad",
    gerenciar: "Gestionar cookies",
  },
  privacidade: {
    titulo: "Política de privacidad",
    atualizado: "Última actualización: 10 de noviembre de 2026",
    intro:
      "Esta política explica qué datos personales tratamos en este sitio, por qué, durante cuánto tiempo y cómo ejercer tus derechos, conforme al Reglamento General de Protección de Datos (RGPD).",
    secoes: [
      {
        titulo: "Responsable del tratamiento",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Contacto: ${DPO.email}.`,
      },
      {
        titulo: "Delegado de protección de datos (DPO)",
        texto: `${DPO.nome} — ${DPO.email}. Para cualquier pregunta sobre tus datos o para ejercer tus derechos, escribe al DPO.`,
      },
      {
        titulo: "Datos que recogemos",
        itens: [
          "Formulario de contacto: nombre, empresa (opcional), correo, teléfono (opcional) y el mensaje que escribes.",
          "Datos técnicos: dirección IP, usada brevemente para proteger el formulario contra abusos y después eliminada automáticamente.",
          "Tu elección sobre cookies: guardada solo en tu navegador.",
        ],
      },
      {
        titulo: "Finalidades y bases legales",
        itens: [
          "Responder a tu solicitud y preparar una propuesta: medidas precontractuales a petición tuya (art. 6.1.b RGPD).",
          "Proteger el sitio y evitar envíos automatizados: interés legítimo (art. 6.1.f RGPD).",
        ],
      },
      {
        titulo: "Destinatarios y encargados",
        texto:
          "Tus datos nunca se venden ni se alquilan. Solo acceden a ellos el equipo de FP Pipe y nuestros proveedores técnicos: Vercel (alojamiento del sitio), Resend (envío de los correos del formulario) y Supabase (base de datos de seguridad).",
      },
      {
        titulo: "Transferencias fuera de la Unión Europea",
        texto:
          "Estos proveedores pueden tratar datos en Estados Unidos. Las transferencias se basan en el Marco de Privacidad de Datos UE–EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.",
      },
      {
        titulo: "Plazo de conservación",
        itens: [
          "Solicitudes de contacto: 3 años desde el último intercambio y después se eliminan.",
          "Dirección IP de seguridad: unos minutos.",
          "Tu elección sobre cookies: 6 meses; después te lo volvemos a preguntar.",
        ],
      },
      {
        titulo: "Tus derechos",
        texto: `Puedes solicitar el acceso, la rectificación, la supresión, la limitación o la portabilidad de tus datos, y oponerte a su tratamiento, escribiendo a ${DPO.email}. Respondemos en el plazo de un mes. Si consideras que tus derechos no se respetan, puedes presentar una reclamación ante tu autoridad de protección de datos (en España, la AEPD — www.aepd.es; en Francia, la CNIL — www.cnil.fr).`,
      },
      {
        titulo: "Cookies",
        texto:
          "Este sitio no instala cookies publicitarias ni de medición de audiencia. Solo pueden usarse elementos técnicos necesarios para su funcionamiento, que no requieren consentimiento. Las fuentes y las imágenes se sirven desde nuestros propios servidores: tu navegador no se conecta a Google ni a otros servicios de terceros. Puedes cambiar tu elección en cualquier momento en «Gestionar cookies», al pie de la página.",
      },
    ],
  },
  rodape: { direitos: "Todos los derechos reservados.", mentions: "Aviso legal", privacidade: "Privacidad" },
  mentions: {
    titulo: "Aviso legal",
    voltar: "Volver al sitio",
    secoes: [
      {
        titulo: "Editor",
        texto: `FP Pipe — CNPJ 69.462.179/0001-03. Director de la publicación: ${DPO.nome}. Contacto: ${DPO.email} · +33 7 45 06 42 79.`,
      },
      {
        titulo: "Alojamiento",
        texto: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Estados Unidos.",
      },
      {
        titulo: "Datos personales",
        texto:
          "La información enviada por el formulario solo se usa para responder a tu solicitud y nunca se vende. Según el RGPD, puedes pedir consultarla o eliminarla en cualquier momento contactándonos.",
      },
      {
        titulo: "Cookies",
        texto:
          "Este sitio no usa cookies publicitarias ni de seguimiento. Solo pueden usarse cookies técnicas necesarias para su funcionamiento.",
      },
    ],
  },
};

export const DICIONARIOS: Record<Idioma, Dicionario> = { fr, en, es };
