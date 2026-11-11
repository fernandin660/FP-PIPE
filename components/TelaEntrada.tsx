"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteSupabase } from "../lib/supabase/client";
import { validarSenhaForca, senhaFoiVazada, MENSAGEM_SENHA_VAZADA } from "../lib/senhas";
import Envelope from "./studio/Envelope";
import ParticulasProspeccao from "./entrada/ParticulasProspeccao";

type Modo = "entrar" | "criar" | "recuperar";

const FASES = [
  { titulo: "Ligue para quem decide", texto: "Telefone e e-mail do decisor de cada empresa, verificados." },
  { titulo: "Mande a primeira mensagem", texto: "Uma abordagem escrita para cada empresa. Você revisa e envia." },
  { titulo: "Feche no funil", texto: "Cada oportunidade acompanhada no CRM, da lista até o contrato." },
];

const TITULOS: Record<Modo, { selo: string; titulo: string; texto: string }> = {
  entrar: {
    selo: "Bem-vindo de volta",
    titulo: "Entrar na FP Pipe",
    texto: "Suas listas e o seu funil estão esperando.",
  },
  criar: {
    selo: "Teste grátis",
    titulo: "Crie sua conta",
    texto: "1 lista com até 25 empresas e o CRM incluído. Sem cartão.",
  },
  recuperar: {
    selo: "Recuperar acesso",
    titulo: "Esqueceu a senha?",
    texto: "Informe seu e-mail e enviamos um link para criar uma nova.",
  },
};

export default function TelaEntrada({ modoInicial = "criar" }: { modoInicial?: Modo }) {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>(modoInicial);
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
      const id = setTimeout(() => setProximoDestino(next), 0);
      return () => clearTimeout(id);
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

    // Se o signOut local (ou o signUp) travar por qualquer motivo, nunca
    // deixamos o usuário preso em "Aguarde...": usamos timeouts de segurança.
    await Promise.race([
      limparSessaoAnterior(),
      new Promise((r) => setTimeout(r, 4000)),
    ]);

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
    } else if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/redefinir`,
      });

      setCarregando(false);

      if (error) {
        setErro("Não conseguimos enviar o e-mail agora. Tente novamente.");
        return;
      }

      setMensagem(
        "Enviamos um link de redefinição para o seu e-mail. Confira a caixa de entrada (e o spam)."
      );
    } else {
      const motivo = validarSenhaForca(senha);
      if (motivo) {
        setCarregando(false);
        setErro(motivo);
        return;
      }
      if (await senhaFoiVazada(senha)) {
        setCarregando(false);
        setErro(MENSAGEM_SENHA_VAZADA);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      setCarregando(false);

      if (error) {
        console.error("Erro ao criar conta:", error.message);
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
        "Conta criada. Confira seu e-mail e clique no link de confirmação."
      );
      }
    }
  }

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro("");
    setMensagem("");
  }

  const cabecalho = TITULOS[modo];

  return (
    <Envelope idioma="pt-BR">
      <div className="grid min-h-[100svh] lg:grid-cols-[1.15fr_1fr]">
        {/* ANIMAÇÃO */}
        <section className="relative h-[320px] border-b border-[#d6d4cd] sm:h-[420px] lg:sticky lg:top-0 lg:h-[100svh] lg:border-b-0 lg:border-r">
          <ParticulasProspeccao fases={FASES} rotulo="Etapas da prospecção" />
          <Link
            href="/plataforma"
            aria-label="FP Pipe — página inicial"
            className="absolute left-6 top-6 z-10 flex items-center gap-2 text-[15px] font-semibold tracking-tight md:left-12 md:top-10"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
            </svg>
            FP Pipe
          </Link>
        </section>

        {/* FORMULÁRIO */}
        <main className="flex items-center justify-center bg-[#fbfaf7] px-6 py-14 md:px-12 lg:py-20">
          <div className="w-full max-w-[420px]">
            <p className="studio-selo mb-5">{cabecalho.selo}</p>
            <h1 className="text-[2.5rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-5xl">
              {cabecalho.titulo}
            </h1>
            <p className="mt-4 text-[#4b4b53]">{cabecalho.texto}</p>

            {modo !== "recuperar" && (
              <div
                role="tablist"
                aria-label="Entrar ou criar conta"
                className="mt-9 grid grid-cols-2 rounded-full border border-[#d6d4cd] p-1 text-sm font-medium"
              >
                {(["entrar", "criar"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={modo === m}
                    onClick={() => trocarModo(m)}
                    className={`min-h-[44px] rounded-full transition-colors ${
                      modo === m ? "bg-[#111114] text-[#f4f3ef]" : "text-[#4b4b53] hover:text-[#111114]"
                    }`}
                  >
                    {m === "entrar" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={submeter} className="mt-8 space-y-7">
              <div>
                <label htmlFor="entrada-email" className="studio-rotulo">
                  E-mail
                </label>
                <input
                  id="entrada-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="studio-campo"
                />
              </div>

              {modo !== "recuperar" && (
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <label htmlFor="entrada-senha" className="studio-rotulo">
                      Senha
                    </label>
                    {modo === "entrar" && (
                      <button
                        type="button"
                        onClick={() => trocarModo("recuperar")}
                        className="text-sm text-[#4b4b53] underline-offset-4 hover:text-[#2442e5] hover:underline"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <input
                    id="entrada-senha"
                    type="password"
                    required
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    aria-describedby={modo === "criar" ? "entrada-senha-dica" : undefined}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="studio-campo"
                  />
                  {modo === "criar" && (
                    <p id="entrada-senha-dica" className="mt-2 text-sm text-[#5e5e66]">
                      8 ou mais caracteres, com maiúscula, minúscula, número e símbolo.
                    </p>
                  )}
                </div>
              )}

              {erro && (
                <p role="alert" className="border-l-2 border-[#b42318] pl-3 text-sm text-[#b42318]">
                  {erro}
                </p>
              )}
              {mensagem && (
                <p role="status" className="border-l-2 border-[#2442e5] pl-3 text-sm text-[#1a33bd]">
                  {mensagem}
                </p>
              )}

              <button type="submit" disabled={carregando} className="studio-botao w-full justify-center disabled:opacity-60">
                {carregando
                  ? "Aguarde…"
                  : modo === "entrar"
                    ? "Entrar"
                    : modo === "recuperar"
                      ? "Enviar link de redefinição"
                      : "Criar conta grátis"}
                {!carregando && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {modo === "recuperar" && (
              <button
                type="button"
                onClick={() => trocarModo("entrar")}
                className="mt-6 text-sm text-[#4b4b53] underline-offset-4 hover:text-[#111114] hover:underline"
              >
                ← Voltar para o login
              </button>
            )}

            <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#d6d4cd] pt-6 text-sm text-[#5e5e66]">
              <Link href="/planos" className="studio-link-nav">Ver planos</Link>
              <Link href="/termos" className="studio-link-nav">Termos</Link>
              <Link href="/privacidade" className="studio-link-nav">Privacidade</Link>
            </div>
          </div>
        </main>
      </div>
    </Envelope>
  );
}
