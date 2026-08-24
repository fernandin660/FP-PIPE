"use client";

import { useEffect } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";


export default function GatilhoNovoUsuario() {
  useEffect(() => {
    const verificar = async () => {
      try {
        const supabase = criarClienteSupabase();
        if (!supabase) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) return;

        await fetch("/api/notificar-novo-usuario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // Notificação nunca derruba a página.
      }
    };

    void verificar();
  }, []);

  return null;
}
