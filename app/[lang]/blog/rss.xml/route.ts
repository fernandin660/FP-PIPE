import { rssBlog } from "../../../../components/blog/PaginasBlog";
import { ehIdioma } from "../../../../components/studio/dicionario";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ lang: "fr" }, { lang: "en" }, { lang: "es" }];
}

export async function GET(_req: Request, { params }: RouteContext<"/[lang]/blog/rss.xml">) {
  const { lang } = await params;
  if (!ehIdioma(lang) || lang === "pt") return new Response("Not found", { status: 404 });
  return rssBlog("sites", lang);
}
