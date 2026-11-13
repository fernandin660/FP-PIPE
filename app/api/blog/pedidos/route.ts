import { NextResponse } from "next/server";
import { enviarPedidosPendentes } from "../../../../lib/blog-aprovacao";

/*
 * Chamado pela rotina do blog logo depois de publicar rascunhos/correções,
 * para o e-mail de aprovação chegar na hora (sem esperar o cron das 9h).
 *
 * Aberto de propósito e inofensivo: só manda e-mail para o endereço fixo do
 * Fernando, no máximo uma vez por versão de post (índice único no banco).
 * Chamar de novo não faz nada.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const r = await enviarPedidosPendentes();
  return NextResponse.json(r.corpo, { status: r.status });
}
