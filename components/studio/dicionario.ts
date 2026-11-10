export const IDIOMAS = ["fr", "en", "es"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export function ehIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}

export const CONTATO = {
  telefone: "+33745064279",
  telefoneVisivel: "+33 7 45 06 42 79",
  // Preencher com o @ da página (ex.: "https://www.instagram.com/fppipe").
  instagram: "",
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
    etiqueta: string;
    projetos: { nome: string; setor: string; frase: string; botao: string }[];
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
  rodape: { direitos: string; mentions: string };
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
    titulo: "Projets concept",
    aviso:
      "Des projets imaginés pour montrer notre approche. Ce ne sont pas des clients réels.",
    etiqueta: "Projet concept",
    projetos: [
      {
        nome: "Maison Lumière",
        setor: "Boulangerie artisanale",
        frase: "Le pain du quartier, cuit chaque matin.",
        botao: "Commander",
      },
      {
        nome: "Moreau Avocats",
        setor: "Cabinet d’avocats",
        frase: "Droit des affaires, avec clarté.",
        botao: "Prendre rendez-vous",
      },
      {
        nome: "Atelier Nord",
        setor: "Architecture",
        frase: "Des espaces qui respirent.",
        botao: "Voir les projets",
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
  rodape: { direitos: "Tous droits réservés.", mentions: "Mentions légales" },
  mentions: {
    titulo: "Mentions légales",
    voltar: "Retour au site",
    secoes: [
      {
        titulo: "Éditeur",
        texto: "FP Pipe — [CNPJ à compléter]. Contact : +33 7 45 06 42 79.",
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
    titulo: "Concept projects",
    aviso: "Projects imagined to show our approach. They are not real clients.",
    etiqueta: "Concept project",
    projetos: [
      {
        nome: "Maison Lumière",
        setor: "Artisan bakery",
        frase: "The neighbourhood’s bread, baked every morning.",
        botao: "Order",
      },
      {
        nome: "Moreau Avocats",
        setor: "Law firm",
        frase: "Business law, made clear.",
        botao: "Book a meeting",
      },
      {
        nome: "Atelier Nord",
        setor: "Architecture",
        frase: "Spaces that breathe.",
        botao: "See projects",
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
  rodape: { direitos: "All rights reserved.", mentions: "Legal notice" },
  mentions: {
    titulo: "Legal notice",
    voltar: "Back to the site",
    secoes: [
      {
        titulo: "Publisher",
        texto: "FP Pipe — [CNPJ to be completed]. Contact: +33 7 45 06 42 79.",
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
    titulo: "Proyectos concepto",
    aviso: "Proyectos imaginados para mostrar nuestro enfoque. No son clientes reales.",
    etiqueta: "Proyecto concepto",
    projetos: [
      {
        nome: "Maison Lumière",
        setor: "Panadería artesanal",
        frase: "El pan del barrio, horneado cada mañana.",
        botao: "Pedir",
      },
      {
        nome: "Moreau Avocats",
        setor: "Despacho de abogados",
        frase: "Derecho mercantil, con claridad.",
        botao: "Pedir cita",
      },
      {
        nome: "Atelier Nord",
        setor: "Arquitectura",
        frase: "Espacios que respiran.",
        botao: "Ver proyectos",
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
  rodape: { direitos: "Todos los derechos reservados.", mentions: "Aviso legal" },
  mentions: {
    titulo: "Aviso legal",
    voltar: "Volver al sitio",
    secoes: [
      {
        titulo: "Editor",
        texto: "FP Pipe — [CNPJ por completar]. Contacto: +33 7 45 06 42 79.",
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
