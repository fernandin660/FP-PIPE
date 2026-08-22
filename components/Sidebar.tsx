"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { criarClienteSupabase } from "../lib/supabase/client";
import type { PerfilVendedor } from "./ModalPerfil";

type Props = {
  perfil: PerfilVendedor | null;
  saldoCreditos: number | null;
  aoAbrirPerfil: () => void;
};

export default function Sidebar({
  perfil,
  saldoCreditos,
  aoAbrirPerfil,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const inicial = (perfil?.nome_empresa || "F").charAt(0).toUpperCase();

  async function sair() {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  const item = (
    href: string,
    rotulo: string,
    icone: string,
    ativo: boolean
  ) => (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
        ativo
          ? "bg-pipe-blue/10 text-pipe-blue border border-pipe-blue/30"
          : "text-gray-300 hover:bg-pipe-dark hover:text-white border border-transparent"
      }`}
    >
      <span>{icone}</span>
      {rotulo}
    </Link>
  );

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-pipe-card border-r border-pipe-border z-40">
      <div className="px-5 py-6">
        <Link href="/" className="font-display text-2xl text-white">
          FP <span className="text-pipe-lime">Pipe</span>
        </Link>
      </div>

      <div className="px-4 pb-4 border-b border-pipe-border">
        <button
          onClick={aoAbrirPerfil}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-pipe-dark border border-pipe-border hover:border-pipe-blue/50 transition text-left"
          title="Editar perfil da empresa"
        >
          {perfil?.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfil.foto_url}
              alt="Logo da empresa"
              className="w-11 h-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-pipe-blue/15 text-pipe-blue flex items-center justify-center font-bold shrink-0">
              {inicial}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {perfil?.nome_empresa || "Complete seu perfil"}
            </p>
            <p className="text-[11px] text-pipe-muted truncate">
              {perfil?.produtos_servicos ? "✏️ Editar perfil" : "⚠️ Perfil incompleto"}
            </p>
          </div>
        </button>

        {saldoCreditos !== null && (
          <p className="mt-3 px-1 text-[11px] text-pipe-muted">
            💳 Créditos:{" "}
            <span className="text-pipe-lime font-bold">{saldoCreditos}</span>
          </p>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {item("/", "Nova prospecção", "🎯", pathname === "/")}
        {item("/listas", "Minhas listas", "📋", pathname === "/listas")}
      </nav>

      <div className="px-4 pb-5">
        <button
          onClick={sair}
          className="w-full text-left text-xs font-semibold text-pipe-muted hover:text-red-400 transition px-4 py-2"
        >
          ⏻ Sair da conta
        </button>
      </div>
    </aside>
  );
}
