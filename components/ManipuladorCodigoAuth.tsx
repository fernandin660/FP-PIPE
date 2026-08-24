"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { criarClienteSupabase } from "../lib/supabase/client";

// Rede de segurança: se o link de recuperação cair com ?code= numa
// página qualquer (ex.: home), troca o código por sessão e manda
// para a tela de nova senha.
export default function ManipuladorCodigoAuth() {
  const router = useRouter();

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const codigo = parametros.get("code");
    const tipoErro = parametros.get("error_code");

    // Link expirado/invalido: manda direto pro login.
    if (tipoErro === "otp_expired") {
      router.replace("/login");
      return;
    }

    if (!codigo || codigo.length < 10) return;

    const supabase = criarClienteSupabase();
    if (!supabase) return;

    (async () => {
      // O proprio cliente Supabase costuma consumir o codigo sozinho ao
      // carregar (detectSessionInUrl). Tentamos o troca manual e, em todo
      // caso, checamos se existe sessao valida para seguir adiante.
      try {
        await supabase.auth.exchangeCodeForSession(codigo);
      } catch {
        // Codigo ja consumido pela deteccao automatica: segue.
      }

      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        router.replace("/auth/redefinir");
      }
    })();
  }, [router]);

  return null;
}
