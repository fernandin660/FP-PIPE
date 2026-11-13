import { rssBlog } from "../../../../components/blog/PaginasBlog";

export const dynamic = "force-static";

export function GET() {
  return rssBlog("sites", "pt");
}
