import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function criarClienteSupabaseServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) return null;

  const armazenador = await cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return armazenador.getAll();
      },
      setAll(listaParaDefinir) {
        try {
          listaParaDefinir.forEach(({ name, value, options }) =>
            armazenador.set(name, value, options)
          );
        } catch {
          // Chamadas de servidor não podem definir cookies; o
          // middleware renova a sessão antes das rotas rodarem.
        }
      },
    },
  });
}
