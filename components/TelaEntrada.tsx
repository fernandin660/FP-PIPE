"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteSupabase } from "../lib/supabase/client";

export default function TelaEntrada() {
  const router = useRouter();

  const [modo, setModo] = useState<"entrar" | "criar">("criar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [proximoDestino, setProximoDestino] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    // Só aceita caminhos internos para evitar open redirect.
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setProximoDestino(next);
    }
  }, []);

  // Garante sessão limpa antes de entrar ou criar conta.
  async function limparSessaoAnterior() {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Sem sessão ativa: segue o jogo.
    }
  }

  async function entrarComGoogle() {
    const supabase = criarClienteSupabase();
    if (!supabase) {
      setErro("Autenticação não configurada.");
      return;
    }

    await limparSessaoAnterior();

    const redirectToGoogle = proximoDestino
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(proximoDestino)}`
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectToGoogle },
    });

    if (error) {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
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

    await limparSessaoAnterior();

    const destinoFinal = proximoDestino || "/prospeccao";

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

      router.push(destinoFinal);
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
        router.push(destinoFinal);
      } else {
        setMensagem(
          "Conta criada! Confira seu e-mail e clique no link de confirmação."
        );
      }
    }
  }

  return (
    <div className="min-h-screen bg-pipe-bg grid lg:grid-cols-2">
      {/* ================= LADO ESQUERDO — PITCH ================= */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-pipe-dark via-pipe-bg to-pipe-card border-r border-pipe-border overflow-hidden">
        <div>
          <p className="font-display text-4xl text-white">
            FP <span className="text-pipe-lime">PIPE</span>
          </p>

          <h1 className="font-display text-5xl leading-tight text-white mt-14">
            Descubra quem está{" "}
            <span className="text-pipe-lime">pronto pra comprar</span>{" "}
            de você.
          </h1>

          <p className="text-pipe-muted mt-6 max-w-md text-lg">
            Nosso sistema monta seu cliente ideal, encontra empresas reais com
            CNPJ, pontua cada uma e entrega quem decide a compra — com nome e
            cargo.
          </p>

          <ul className="mt-8 space-y-3 text-gray-300">
            {[
              "ICP completo em menos de 1 minuto",
              "Empresas reais com score de aderência 0-100",
              "Decisor certo: aprovador e influenciador da venda",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-pipe-lime mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual: agendamento de reunião */}
        <div className="relative h-64 mt-10">
          <div className="absolute left-0 top-4 w-80 bg-pipe-card border border-pipe-border rounded-xl p-5 shadow-2xl -rotate-2">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-lg bg-pipe-blue/15 flex items-center justify-center text-2xl">
                📅
              </span>
              <div>
                <p className="text-white font-semibold text-sm">
                  Reunião agendada
                </p>
                <p className="text-pipe-muted text-xs">
                  Terça, 14h · via Teams
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs bg-lime-500/15 text-lime-400 px-2 py-1 rounded-full font-semibold">
                ✓ Confirmado
              </span>
              <span className="text-xs text-pipe-muted">
                Diretor de TI · Logística
              </span>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 w-72 bg-pipe-card border border-pipe-border rounded-xl p-5 shadow-2xl rotate-2">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-lg bg-lime-500/15 flex items-center justify-center font-bold text-pipe-lime text-lg">
                87
              </span>
              <div>
                <p className="text-white font-semibold text-sm">
                  Transportadora LTDA
                </p>
                <p className="text-pipe-muted text-xs">Campinas/SP</p>
              </div>
            </div>
            <p className="text-xs text-gray-300 mt-3">
              🎯 Fale com:{" "}
              <span className="text-pipe-lime">Gerente Comercial</span>
            </p>
          </div>

          <span className="absolute left-40 bottom-24 text-3xl animate-bounce">
            ✉️
          </span>
        </div>

        <p className="text-pipe-muted/60 text-xs mt-8">
          © FP Pipe — Inteligência comercial para quem vende B2B.{" "}
          <a href="/" className="hover:text-pipe-blue transition">
            Conheça os diferenciais →
          </a>
        </p>
      </div>

      {/* ================= LADO DIREITO — LOGIN ================= */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <p className="font-display text-3xl text-white">
              FP <span className="text-pipe-lime">PIPE</span>
            </p>
          </div>

          <h2 className="font-display text-4xl text-white">
            Bem-vindo ao{" "}
            <span className="text-pipe-lime">seu pipeline</span>
          </h2>

          <p className="text-pipe-muted text-sm mt-2">
            Crie sua conta grátis e ganhe 5 créditos para testar.{" "}
            <a
              href="/planos"
              className="text-pipe-blue hover:underline font-medium"
            >
              Ver planos
            </a>
          </p>

          <div className="flex gap-2 mt-8 bg-pipe-dark rounded-lg p-1">
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

            {mensagem && (
              <p className="text-pipe-lime text-sm">{mensagem}</p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {carregando
                ? "Aguarde..."
                : modo === "entrar"
                  ? "Entrar no sistema →"
                  : "Criar conta grátis →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
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
            Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
