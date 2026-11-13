import type { Idioma } from "../components/studio/dicionario";
import type { Blog } from "./blog";

type TextosBlog = {
  nome: string;
  titulo: string;
  descricao: string;
  selo: string;
  vazio: string;
  rascunho: string;
  lerMais: string;
  minutos: string;
  publicado: string;
  atualizado: string;
  porAutor: string;
  sumario: string;
  voltar: string;
  inicio: string;
  outrosIdiomas: string;
  cta: { titulo: string; texto: string; botao: string; href: string };
  ia: string;
};

/** Textos da interface dos blogs (o conteúdo dos posts vem dos arquivos). */
export const TEXTOS_BLOG: Record<Blog, Record<Idioma, TextosBlog>> = {
  sites: {
    pt: {
      nome: "Blog",
      titulo: "Blog FP Pipe — sites que trazem clientes",
      descricao: "Guias práticos sobre sites para pequenas empresas: quanto custa, o que precisa ter e como aparecer no Google, no Brasil e na Europa.",
      selo: "Blog · Sites para empresas",
      vazio: "Os primeiros artigos estão chegando.",
      rascunho: "Rascunho — visível só na prévia",
      lerMais: "Ler artigo",
      minutos: "min de leitura",
      publicado: "Publicado em",
      atualizado: "Atualizado em",
      porAutor: "Por",
      sumario: "Neste artigo",
      voltar: "Todos os artigos",
      inicio: "Início",
      outrosIdiomas: "Também em",
      cta: { titulo: "Quer um site que traga clientes?", texto: "Conte o que a sua empresa faz e respondemos com uma proposta.", botao: "Falar com a FP Pipe", href: "/#contact" },
      ia: "Escrito pela equipe da FP Pipe com apoio de IA na pesquisa e revisão.",
    },
    fr: {
      nome: "Blog",
      titulo: "Blog FP Pipe — des sites qui amènent des clients",
      descricao: "Guides pratiques sur les sites web pour petites entreprises : prix, contenu indispensable et visibilité sur Google, en France et en Europe.",
      selo: "Blog · Sites pour entreprises",
      vazio: "Les premiers articles arrivent bientôt.",
      rascunho: "Brouillon — visible uniquement en aperçu",
      lerMais: "Lire l'article",
      minutos: "min de lecture",
      publicado: "Publié le",
      atualizado: "Mis à jour le",
      porAutor: "Par",
      sumario: "Dans cet article",
      voltar: "Tous les articles",
      inicio: "Accueil",
      outrosIdiomas: "Aussi en",
      cta: { titulo: "Envie d'un site qui amène des clients ?", texto: "Dites-nous ce que fait votre entreprise, nous revenons avec une proposition.", botao: "Contacter FP Pipe", href: "/fr#contact" },
      ia: "Rédigé par l'équipe FP Pipe, avec l'aide de l'IA pour la recherche et la relecture.",
    },
    en: {
      nome: "Blog",
      titulo: "FP Pipe Blog — websites that bring customers",
      descricao: "Practical guides on websites for small businesses: cost, must-have content and how to show up on Google, in Europe and the Americas.",
      selo: "Blog · Websites for businesses",
      vazio: "The first articles are on their way.",
      rascunho: "Draft — visible in preview only",
      lerMais: "Read article",
      minutos: "min read",
      publicado: "Published",
      atualizado: "Updated",
      porAutor: "By",
      sumario: "In this article",
      voltar: "All articles",
      inicio: "Home",
      outrosIdiomas: "Also in",
      cta: { titulo: "Want a website that brings customers?", texto: "Tell us what your business does and we'll reply with a proposal.", botao: "Talk to FP Pipe", href: "/en#contact" },
      ia: "Written by the FP Pipe team, with AI assistance for research and editing.",
    },
    es: {
      nome: "Blog",
      titulo: "Blog FP Pipe — sitios web que traen clientes",
      descricao: "Guías prácticas sobre sitios web para pequeñas empresas: precio, contenido imprescindible y cómo aparecer en Google, en Europa y América.",
      selo: "Blog · Sitios para empresas",
      vazio: "Los primeros artículos están en camino.",
      rascunho: "Borrador — visible solo en la vista previa",
      lerMais: "Leer artículo",
      minutos: "min de lectura",
      publicado: "Publicado el",
      atualizado: "Actualizado el",
      porAutor: "Por",
      sumario: "En este artículo",
      voltar: "Todos los artículos",
      inicio: "Inicio",
      outrosIdiomas: "También en",
      cta: { titulo: "¿Quieres un sitio que traiga clientes?", texto: "Cuéntanos qué hace tu empresa y te respondemos con una propuesta.", botao: "Hablar con FP Pipe", href: "/es#contact" },
      ia: "Escrito por el equipo de FP Pipe, con apoyo de IA en la investigación y la revisión.",
    },
  },
  prospeccao: {
    pt: {
      nome: "Blog",
      titulo: "Blog FP Pipe — prospecção B2B, vendas e leads",
      descricao: "Como encontrar empresas, chegar a quem decide e transformar listas em vendas: prospecção B2B, CRM e dados, nas Américas e na Europa.",
      selo: "Blog · Prospecção e vendas",
      vazio: "Os primeiros artigos estão chegando.",
      rascunho: "Rascunho — visível só na prévia",
      lerMais: "Ler artigo",
      minutos: "min de leitura",
      publicado: "Publicado em",
      atualizado: "Atualizado em",
      porAutor: "Por",
      sumario: "Neste artigo",
      voltar: "Todos os artigos",
      inicio: "Plataforma",
      outrosIdiomas: "Também em",
      cta: { titulo: "Prospecte com a FP Pipe", texto: "Encontre empresas com o perfil do seu cliente, veja quem decide e organize tudo no CRM.", botao: "Testar grátis", href: "/prospeccao" },
      ia: "Escrito pela equipe da FP Pipe com apoio de IA na pesquisa e revisão.",
    },
    fr: {
      nome: "Blog",
      titulo: "Blog FP Pipe — prospection B2B, vente et leads",
      descricao: "Trouver des entreprises, atteindre les décideurs et transformer des listes en ventes : prospection B2B, CRM et données, en Europe et dans les Amériques.",
      selo: "Blog · Prospection et vente",
      vazio: "Les premiers articles arrivent bientôt.",
      rascunho: "Brouillon — visible uniquement en aperçu",
      lerMais: "Lire l'article",
      minutos: "min de lecture",
      publicado: "Publié le",
      atualizado: "Mis à jour le",
      porAutor: "Par",
      sumario: "Dans cet article",
      voltar: "Tous les articles",
      inicio: "Plateforme",
      outrosIdiomas: "Aussi en",
      cta: { titulo: "Prospectez avec FP Pipe", texto: "Trouvez les entreprises qui ressemblent à vos clients, identifiez les décideurs et suivez tout dans le CRM.", botao: "Essai gratuit", href: "/prospeccao" },
      ia: "Rédigé par l'équipe FP Pipe, avec l'aide de l'IA pour la recherche et la relecture.",
    },
    en: {
      nome: "Blog",
      titulo: "FP Pipe Blog — B2B prospecting, sales and leads",
      descricao: "How to find companies, reach decision makers and turn lists into sales: B2B prospecting, CRM and data across the Americas and Europe.",
      selo: "Blog · Prospecting and sales",
      vazio: "The first articles are on their way.",
      rascunho: "Draft — visible in preview only",
      lerMais: "Read article",
      minutos: "min read",
      publicado: "Published",
      atualizado: "Updated",
      porAutor: "By",
      sumario: "In this article",
      voltar: "All articles",
      inicio: "Platform",
      outrosIdiomas: "Also in",
      cta: { titulo: "Prospect with FP Pipe", texto: "Find companies that look like your customers, see who decides and track it all in the CRM.", botao: "Try it free", href: "/prospeccao" },
      ia: "Written by the FP Pipe team, with AI assistance for research and editing.",
    },
    es: {
      nome: "Blog",
      titulo: "Blog FP Pipe — prospección B2B, ventas y leads",
      descricao: "Cómo encontrar empresas, llegar a quien decide y convertir listas en ventas: prospección B2B, CRM y datos en América y Europa.",
      selo: "Blog · Prospección y ventas",
      vazio: "Los primeros artículos están en camino.",
      rascunho: "Borrador — visible solo en la vista previa",
      lerMais: "Leer artículo",
      minutos: "min de lectura",
      publicado: "Publicado el",
      atualizado: "Actualizado el",
      porAutor: "Por",
      sumario: "En este artículo",
      voltar: "Todos los artículos",
      inicio: "Plataforma",
      outrosIdiomas: "También en",
      cta: { titulo: "Prospecta con FP Pipe", texto: "Encuentra empresas con el perfil de tu cliente, descubre quién decide y organízalo todo en el CRM.", botao: "Prueba gratis", href: "/prospeccao" },
      ia: "Escrito por el equipo de FP Pipe, con apoyo de IA en la investigación y la revisión.",
    },
  },
};

export const NOME_IDIOMA: Record<Idioma, string> = { pt: "Português", fr: "Français", en: "English", es: "Español" };
export const LOCALE_DATA: Record<Idioma, string> = { pt: "pt-BR", fr: "fr-FR", en: "en-GB", es: "es-ES" };
