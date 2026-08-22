"use client";

import { useState } from "react";
import { criarClienteSupabase } from "../lib/supabase/client";

type Props = {
  aberto: boolean;
  onFechar: () => void;
};

export default function AuthModal({ aberto, onFechar }: Props) {
  const [modo, setModo] = useState<"entrar" | "criar">("criar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  if (!aberto) return null;

  async function entrarComGoogle() {
    const supabase = criarClienteSupabase();
    if (!supabase) {
      setErro("Autenticação não configurada.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setErro(
        "Login com Google ainda não está configurado. Use e-mail e senha por enquanto."
      );
    }
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();

    const supabase = criarClienteSupabase();
    if (!supabase) {
      setErro("Autenticação não configurada.");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      setCarregando(false);

      if (error) {
        setErro("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      onFechar();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      setCarregando(false);

      if (error) {
        setErro(
          error.message.includes("already")
            ? "Este e-mail já tem conta. Faça login."
            : "Não foi possível criar a conta. Verifique os dados."
        );
        return;
      }

      if (data.session) {
        onFechar();
      } else {
        setMensagem(
          "Conta criada! Confira seu e-mail e clique no link de confirmação. Esta janela pode ser fechada — seus dados continuam aqui."
        );
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-pipe-card border border-pipe-border rounded-xl p-8 relative">
        <button
          onClick={onFechar}
          className="absolute top-4 right-5 text-pipe-muted hover:text-white text-xl transition"
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 className="font-display text-3xl text-white">
          Falta pouco!{" "}
          <span className="text-pipe-lime">Crie sua conta grátis</span>
        </h2>

        <p className="text-pipe-muted text-sm mt-2">
          Seus dados estão salvos e continuam aqui mesmo após o login.
        </p>

        <div className="flex gap-2 mt-6 bg-pipe-dark rounded-lg p-1">
          <button
            onClick={() => setModo("entrar")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              modo === "entrar"
                ? "bg-pipe-blue text-black"
                : "text-pipe-muted hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setModo("criar")}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
              modo === "criar"
                ? "bg-pipe-blue text-black"
                : "text-pipe-muted hover:text-white"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submeter} className="space-y-4 mt-6">
          <input
            type="email"
            required
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
          />

          <input
            type="password"
            required
            minLength={6}
            placeholder="Sua senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
          />

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          {mensagem && <p className="text-pipe-lime text-sm">{mensagem}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar e continuar →"
                : "Criar conta e continuar →"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px bg-pipe-border" />
          <span className="text-pipe-muted text-xs">ou</span>
          <span className="flex-1 h-px bg-pipe-border" />
        </div>

        <button
          onClick={entrarComGoogle}
          className="w-full bg-white text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
