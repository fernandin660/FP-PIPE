import { createBrowserClient } from "@supabase/ssr";

export function criarClienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) return null;

  return createBrowserClient(url, chave);
}
