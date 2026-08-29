"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";

export default function LinkUsuario() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ email: string; nome?: string } | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    const supabase = criarClienteSupabase();
    if (!supabase) {
      setCarregando(false);
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!ativo) return;
      if (user) {
        setUsuario({
          email: user.email ?? "",
          nome: user.user_metadata?.nome || user.user_metadata?.name,
        });
      }
      setCarregando(false);
    })();

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo) return;
      const u = sessao?.user;
      if (u) {
        setUsuario({
          email: u.email ?? "",
          nome: u.user_metadata?.nome || u.user_metadata?.name,
        });
      } else {
        setUsuario(null);
        setAberto(false);
      }
    });

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  async function sair() {
    const supabase = criarClienteSupabase();
    if (supabase) await supabase.auth.signOut();
    setAberto(false);
    router.refresh();
  }

  if (carregando) {
    return <div className="hidden sm:block w-20 h-9 rounded-lg bg-pipe-card animate-pulse" />;
  }

  if (!usuario) {
    return (
      <Link
        href="/login"
        className="text-sm font-semibold text-pipe-muted hover:text-white transition hidden sm:block"
      >
        Entrar
      </Link>
    );
  }

  const inicial = (usuario.nome || usuario.email).trim().charAt(0).toUpperCase();

  return (
    <div className="relative hidden sm:block" ref={areaRef}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-white border border-pipe-border rounded-lg px-2 py-1.5 hover:border-pipe-blue transition"
      >
        <span className="w-7 h-7 rounded-full bg-pipe-blue/20 text-pipe-blue flex items-center justify-center font-bold text-sm">
          {inicial}
        </span>
        <span className="max-w-[140px] truncate">
          {usuario.nome || usuario.email.split("@")[0]}
        </span>
        <svg
          className={`w-3 h-3 text-pipe-muted transition ${aberto ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-60 bg-pipe-card border border-pipe-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-pipe-border">
            <p className="text-sm font-bold text-white truncate">
              {usuario.nome || "Bem-vindo"}
            </p>
            <p className="text-xs text-pipe-muted truncate">{usuario.email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/prospeccao"
              onClick={() => setAberto(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-white hover:bg-pipe-dark transition"
            >
              🎯 Acessar inteligência
            </Link>
            <button
              onClick={sair}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-pipe-muted hover:text-red-400 hover:bg-pipe-dark transition"
            >
              ⏻ Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
