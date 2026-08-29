"use client";

import { useEffect, useRef } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";

const INATIVIDADE_MAXIMA_MS = 12 * 60 * 60 * 1000; // 12 horas
const CHAVE_ULTIMA_ATIVIDADE = "fppipe_ultima_atividade";
const INTERVALO_VERIFICACAO_MS = 30 * 1000; // verifica a cada 30s

export default function GerenciadorSessao() {
  const ocupado = useRef(false);

  useEffect(() => {
    const marcarAtividade = () => {
      try {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
      } catch {
        // localStorage indisponível: segue sem persistir.
      }
    };

    const registrarBase = () => {
      try {
        if (!localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE)) {
          localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
        }
      } catch {
        // ignora
      }
    };

    const verificarInatividade = async () => {
      const supabase = criarClienteSupabase();
      if (!supabase || ocupado.current) return;

      let ultimaAtividade: number;
      try {
        ultimaAtividade = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE) ?? 0);
      } catch {
        return;
      }
      if (!ultimaAtividade) return;

      const passouDoLimite = Date.now() - ultimaAtividade >= INATIVIDADE_MAXIMA_MS;
      if (!passouDoLimite) return;

      // Confirma que ainda existe sessão antes de encerrar.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      ocupado.current = true;
      try {
        await supabase.auth.signOut();
      } finally {
        ocupado.current = false;
      }
    };

    registrarBase();
    marcarAtividade();

    const eventos = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    eventos.forEach((evento) =>
      window.addEventListener(evento, marcarAtividade)
    );

    const temporizador = setInterval(() => {
      void verificarInatividade();
    }, INTERVALO_VERIFICACAO_MS);

    return () => {
      eventos.forEach((evento) =>
        window.removeEventListener(evento, marcarAtividade)
      );
      clearInterval(temporizador);
    };
  }, []);

  return null;
}
