import { ORDEM, precos } from "../plataforma/LandingPlataforma";
import { TEXTOS_PLATAFORMA } from "../plataforma/textos";
import { CONTATO, DICIONARIOS, DPO, caminhoIdioma, caminhoPlataforma, type Idioma } from "../studio/dicionario";
import { DEFINICAO_PLANOS } from "../../lib/planos";
import { LANG_HTML, ORIGEM_SITE } from "../../lib/seo";

/*
 * Dados estruturados (schema.org em JSON-LD): dizem ao Google, ao Bing e às
 * buscas com IA quem é a FP Pipe, o que oferece, preços e perguntas
 * frequentes. Tudo aqui repete o que já está visível na página — o Google
 * penaliza dados estruturados que não batem com o conteúdo.
 */

const ID_ORG = `${ORIGEM_SITE}/#organizacao`;
const ID_SITE = `${ORIGEM_SITE}/#site`;

function organizacao() {
  return {
    "@type": "Organization",
    "@id": ID_ORG,
    name: "FP Pipe",
    url: `${ORIGEM_SITE}/`,
    logo: { "@type": "ImageObject", url: `${ORIGEM_SITE}/og-fppipe.png`, width: 1200, height: 630 },
    email: DPO.email,
    telephone: CONTATO.telefone,
    sameAs: [CONTATO.instagram, CONTATO.linkedin],
    founder: { "@type": "Person", name: DPO.nome },
    areaServed: ["Europe", "Americas"],
  };
}

function site() {
  return {
    "@type": "WebSite",
    "@id": ID_SITE,
    url: `${ORIGEM_SITE}/`,
    name: "FP Pipe",
    inLanguage: Object.values(LANG_HTML),
    publisher: { "@id": ID_ORG },
  };
}

/** Página do estúdio (criação de sites). */
export function dadosEstudio(lang: Idioma) {
  const dic = DICIONARIOS[lang];
  const url = `${ORIGEM_SITE}${caminhoIdioma(lang)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizacao(),
      site(),
      {
        "@type": "ProfessionalService",
        "@id": `${ORIGEM_SITE}/#estudio`,
        name: "FP Pipe Studio",
        url,
        description: dic.meta.descricao,
        parentOrganization: { "@id": ID_ORG },
        telephone: CONTATO.telefone,
        email: DPO.email,
        image: `${ORIGEM_SITE}/og-fppipe.png`,
        areaServed: ["Europe", "Americas"],
        knowsLanguage: ["pt-BR", "fr", "en", "es"],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: dic.servicos.titulo,
          itemListElement: dic.servicos.itens.map((s) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: s.titulo, description: s.texto },
          })),
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#pagina`,
        url,
        name: dic.meta.titulo,
        description: dic.meta.descricao,
        inLanguage: LANG_HTML[lang],
        isPartOf: { "@id": ID_SITE },
        about: { "@id": `${ORIGEM_SITE}/#estudio` },
      },
    ],
  };
}

/** Página da plataforma (prospecção e CRM). */
export function dadosPlataforma(lang: Idioma) {
  const t = TEXTOS_PLATAFORMA[lang];
  const url = `${ORIGEM_SITE}${caminhoPlataforma(lang)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizacao(),
      site(),
      {
        "@type": "SoftwareApplication",
        "@id": `${ORIGEM_SITE}/plataforma#software`,
        name: "FP Pipe",
        url,
        description: t.meta.descricao,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "CRM",
        operatingSystem: "Web",
        inLanguage: LANG_HTML[lang],
        publisher: { "@id": ID_ORG },
        offers: ORDEM.map((chave) => ({
          "@type": "Offer",
          name: DEFINICAO_PLANOS[chave].nome,
          price: precos(chave, t).mensal,
          priceCurrency: t.moeda,
          url: `${url}#planos`,
          category: "subscription",
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#perguntas`,
        inLanguage: LANG_HTML[lang],
        mainEntity: t.perguntas.itens.map((p) => ({
          "@type": "Question",
          name: p.pergunta,
          acceptedAnswer: { "@type": "Answer", text: p.resposta },
        })),
      },
    ],
  };
}

/**
 * Injeta o JSON-LD na página. O conteúdo é nosso (estático), mas ainda assim
 * escapamos "<" para que nenhum texto consiga fechar a tag <script> (XSS).
 */
export default function DadosEstruturados({ dados }: { dados: object }) {
  const json = JSON.stringify(dados).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
