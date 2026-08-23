import { createClient } from "@supabase/supabase-js";

export function criarClienteSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chaveServico) return null;

  return createClient(url, chaveServico, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
