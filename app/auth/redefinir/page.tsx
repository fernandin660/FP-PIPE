"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { criarClienteSupabase } from "../../../lib/supabase/client";
import { validarSenhaForca } from "../../../lib/senhas";

export default function PaginaRedefinir() {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      // O link do e-mail loga o usuário automaticamente nesta página.
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        setVerificando(false);
      } else {
        setLinkInvalido(true);
        setVerificando(false);
      }
    })();
  }, []);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();

    const supabase = criarClienteSupabase();
    if (!supabase) return;

    setErro("");

    const motivo = validarSenhaForca(senha);
    if (motivo) {
      setErro(motivo);
      return;
    }

    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.updateUser({ password: senha });

    setCarregando(false);

    if (error) {
      setErro("Não foi possível salvar a nova senha. Tente outra.");
      return;
    }

    setConcluido(true);
  }

  return (
    <main className="min-h-screen bg-pipe-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-pipe-card border border-pipe-border rounded-2xl p-8">
        {verificando ? (
          <p className="text-pipe-muted text-sm text-center">
            Verificando seu link...
          </p>
        ) : linkInvalido ? (
          <div className="text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h1 className="font-display text-2xl text-white">
              Link inválido ou expirado
            </h1>
            <p className="text-pipe-muted text-sm">
              Solicite um novo link na tela de login.
            </p>
            <Link
              href="/login"
              className="inline-block bg-pipe-lime text-black font-bold py-3 px-6 rounded-lg hover:opacity-90 transition"
            >
              Ir para o login
            </Link>
          </div>
        ) : concluido ? (
          <div className="text-center space-y-4">
            <p className="text-4xl">✅</p>
            <h1 className="font-display text-2xl text-white">
              Senha alterada!
            </h1>
            <p className="text-pipe-muted text-sm">
              Sua nova senha já está ativa.
            </p>
            <button
              onClick={() => router.push("/prospeccao")}
              className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
            >
              Ir para o sistema →
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl text-white">
              Criar nova senha
            </h1>
            <p className="text-pipe-muted text-sm mt-2 mb-6">
              Escolha uma senha forte para proteger sua conta.
            </p>

            <form onSubmit={submeter} className="space-y-4">
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Nova senha (8+ caracteres, com letra e número)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
              />

              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Confirme a nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
              />

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {carregando ? "Salvando..." : "Salvar nova senha →"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
