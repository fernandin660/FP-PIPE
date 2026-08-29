import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "./supabase/server";
import { avaliarAcesso, type AcessoUsuario } from "./planos";
import { resolverOrg, type ContextoOrg, type PapelOrg } from "./org";

type ClienteServidor = NonNullable<
  Awaited<ReturnType<typeof criarClienteSupabaseServidor>>
>;

export interface ContextoAcesso {
  supabase: ClienteServidor;
  usuarioId: string;
  orgId: string;
  papel: PapelOrg;
  acesso: AcessoUsuario;
}

/**
 * Portao padrao das rotas de API: exige login, resolve a
 * organização do usuário e devolve o plano ativo.
 * Quando bloqueia, devolve `resposta` pronta pra retornar ao cliente.
 */
export async function exigirAcesso(): Promise<{
  ctx?: ContextoAcesso;
  resposta?: NextResponse;
}> {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return {
      resposta: NextResponse.json(
        { erro: "Autenticação não configurada." },
        { status: 503 }
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      resposta: NextResponse.json(
        { erro: "Faça login para usar esta função.", motivo: "sem_login" },
        { status: 401 }
      ),
    };
  }

  // Resolve a organização primeiro (o plano pertence à org), depois avalia
  // o acesso herdando o plano pago da empresa.
  const contextoOrg = await resolverOrg(supabase, user.id);

  const acesso = await avaliarAcesso(supabase, user.id, contextoOrg.orgId);

  if (acesso.expirada) {
    return {
      resposta: NextResponse.json(
        {
          erro:
            "Seu plano expirou. Assine ou renove em /planos para continuar.",
          motivo: "plano_expirado",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ctx: {
      supabase,
      usuarioId: user.id,
      orgId: contextoOrg.orgId,
      papel: contextoOrg.papel,
      acesso,
    },
  };
}
