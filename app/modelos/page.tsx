"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type PerfilVendedor,
} from "../../components/ModalPerfil";

type ModeloSalvo = {
  id: string;
  nome: string;
  canal: string;
  objetivo: string;
  produto: string | null;
  argumento: string | null;
  assunto: string | null;
  conteudo: string;
  criado_em: string;
};

const ICONE_CANAL: Record<string, string> = {
  email: "✉️ E-mail",
  linkedin: "💼 LinkedIn",
  whatsapp: "💬 WhatsApp",
  ligacao: "📞 Ligação",
};

export default function PaginaModelos() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modelos, setModelos] = useState<ModeloSalvo[]>([]);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const supabase = criarClienteSupabase();
      if (!supabase) {
        setCarregando(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: dadosPerfil } = await supabase
        .from("perfil")
        .select(
          "nome_empresa, area_atuacao, produtos_servicos, site, foto_url, anexos, nichos"
        )
        .eq("usuario_id", user.id)
        .maybeSingle();

      setPerfil((dadosPerfil as PerfilVendedor) ?? null);

      const { data: dadosCreditos } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();

      setSaldoCreditos(dadosCreditos?.saldo ?? null);

      const { data: dadosModelos } = await supabase
        .from("modelos")
        .select(
          "id, nome, canal, objetivo, produto, argumento, assunto, conteudo, criado_em"
        )
        .order("criado_em", { ascending: false });

      setModelos((dadosModelos as ModeloSalvo[]) ?? []);

      setCarregando(false);
    }

    carregar();
  }, [router]);

  const copiarModelo = async (modelo: ModeloSalvo) => {
    try {
      const texto =
        modelo.canal === "email" && modelo.assunto
          ? `${modelo.assunto}\n\n${modelo.conteudo}`
          : modelo.conteudo;

      await navigator.clipboard.writeText(texto);
      setCopiadoId(modelo.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      console.error("Não conseguimos copiar.");
    }
  };

  const excluirModelo = async (id: string) => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.from("modelos").delete().eq("id", id);

    setModelos((atual) => atual.filter((m) => m.id !== id));
    if (abertoId === id) setAbertoId(null);
  };

  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />

      <ModalPerfil
        key={`perfil-modelos-${modalPerfilAberto}-${perfil?.produtos_servicos ? "ok" : "vazio"}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <main className="min-h-screen bg-pipe-dark px-6 py-12 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/prospeccao" className="font-display text-3xl text-white">
              FP <span className="text-pipe-lime">Pipe</span>
            </Link>

            <Link
              href="/prospeccao"
              className="bg-pipe-lime text-black font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition text-sm"
            >
              + Nova prospecção
            </Link>
          </div>

          <h1 className="font-display text-5xl text-white mt-10">Modelos</h1>

          <p className="text-pipe-muted mt-3 max-w-2xl">
            Suas abordagens salvas como modelo. Consulte, copie e reutilize o
            que funciona — a qualquer momento. ⭐
          </p>

          {!carregando && modelos.length === 0 && (
            <p className="text-center text-pipe-muted mt-16">
              Nenhum modelo ainda. Gere uma abordagem e clique em{" "}
              <span className="text-amber-400">⭐ Salvar como modelo</span> pra
              guardá-la aqui.
            </p>
          )}

          <div className="mt-8 space-y-3">
            {modelos.map((modelo) => (
              <div
                key={modelo.id}
                className="bg-pipe-card border border-pipe-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      ⭐ {modelo.nome}
                    </p>
                    <p className="text-xs text-pipe-muted mt-1">
                      {ICONE_CANAL[modelo.canal] ?? modelo.canal}
                      {" · "}
                      {new Date(modelo.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copiarModelo(modelo)}
                      className="text-xs font-semibold bg-pipe-lime text-black px-3 py-2 rounded-lg hover:opacity-90 transition"
                    >
                      {copiadoId === modelo.id ? "✅ Copiado!" : "📋 Copiar"}
                    </button>

                    <button
                      onClick={() =>
                        setAbertoId(abertoId === modelo.id ? null : modelo.id)
                      }
                      className="text-xs font-semibold border border-pipe-border text-gray-300 px-3 py-2 rounded-lg hover:bg-pipe-dark transition"
                    >
                      {abertoId === modelo.id ? "▲ Fechar" : "▼ Ver texto"}
                    </button>

                    <button
                      onClick={() => excluirModelo(modelo.id)}
                      title="Excluir modelo"
                      className="text-xs font-semibold border border-red-500/30 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {abertoId === modelo.id && (
                  <div className="mt-4 space-y-2">
                    {modelo.argumento && (
                      <p className="text-xs text-pipe-lime border-l-2 border-pipe-lime/40 pl-3">
                        {modelo.argumento}
                      </p>
                    )}

                    {modelo.canal === "email" && modelo.assunto && (
                      <p className="text-sm text-gray-200">
                        <strong>Assunto:</strong> {modelo.assunto}
                      </p>
                    )}

                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed bg-pipe-dark border border-pipe-border rounded-xl p-4">
{modelo.conteudo}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
