import { NextResponse } from "next/server";
import { enviarPedidosPendentes } from "../../../../lib/blog-aprovacao";

/*
 * Cron diário (vercel.json): manda o e-mail de aprovação dos posts
 * "aguardando" que ainda não têm pedido. A rotina que escreve os posts
 * também chama /api/blog/pedidos logo depois do deploy; este cron é a rede
 * de segurança caso essa chamada falhe.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const r = await enviarPedidosPendentes();
  return NextResponse.json(r.corpo, { status: r.status });
}
