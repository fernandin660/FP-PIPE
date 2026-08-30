"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";
import type { PerfilVendedor } from "./ModalPerfil";

type Props = {
  perfil: PerfilVendedor | null;
  saldoCreditos: number | null;
  aoAbrirPerfil: () => void;
};

const EMAIL_ADMIN =
  process.env.NEXT_PUBLIC_EMAIL_ADMIN ?? "fernandopugliesi@fppipe.com.br";

export default function Sidebar({
  perfil,
  saldoCreditos,
  aoAbrirPerfil,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [temBuscador, setTemBuscador] = useState<boolean | null>(null);
  const [popupBuscadorAberto, setPopupBuscadorAberto] = useState(false);
  const [popupDisparosAberto, setPopupDisparosAberto] = useState(false);
  const [crmAberto, setCrmAberto] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [orgNome, setOrgNome] = useState<string | null>(null);
  const [orgPapel, setOrgPapel] = useState<string | null>(null);
  const [crmResumo, setCrmResumo] = useState<{
    total: number;
    porEstagio: Array<{ id: string; nome: string; cor: string; total: number }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if ((user?.email ?? "").toLowerCase() === EMAIL_ADMIN) {
        setEhAdmin(true);
      }

      const { data } = await supabase
        .from("assinaturas")
        .select("plano, status, renova_em")
        .maybeSingle();

      const plano = data?.plano ?? "teste";
      const statusValido = !data || data.status === "ativa";
      const dentroDaValidade =
        !data?.renova_em ||
        new Date(data.renova_em).getTime() > Date.now() ||
        plano === "teste";

      setTemBuscador(
        statusValido &&
          dentroDaValidade &&
          (plano === "gold" ||
            plano === "platinum" ||
            plano === "gold_intl" ||
            plano === "platinum_intl")
      );

      // Busca dados da organização
      try {
        const resOrg = await fetch("/api/org");
        if (resOrg.ok) {
          const dadosOrg = await resOrg.json();
          if (dadosOrg.nome) setOrgNome(dadosOrg.nome);
          if (dadosOrg.papel) setOrgPapel(dadosOrg.papel);
        }
      } catch {
        // ignora
      }

      // Resumo do pipeline para dar visibilidade do CRM no menu
      try {
        const resCrm = await fetch("/api/crm/resumo", { cache: "no-store" });
        if (resCrm.ok) setCrmResumo(await resCrm.json());
      } catch {
        // ignora
      }
    })();
  }, []);

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

  function itemBuscador() {
    const classes = `w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
      pathname === "/buscador" && temBuscador !== false
        ? "bg-pipe-blue/10 text-pipe-blue border border-pipe-blue/30"
        : temBuscador === false
          ? "text-gray-400 hover:bg-pipe-dark hover:text-white border border-dashed border-pipe-border"
          : "text-gray-300 hover:bg-pipe-dark hover:text-white border border-transparent"
    }`;

    if (temBuscador === false) {
      return (
        <button
          key="/buscador"
          onClick={() => setPopupBuscadorAberto(true)}
          className={classes}
        >
          <span>🔎</span>
          Buscador de contatos
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-pipe-lime/15 text-pipe-lime px-1.5 py-0.5 rounded">
            Gold
          </span>
        </button>
      );
    }

    return item("/buscador", "Buscador de contatos", "🔎", pathname === "/buscador");
  }

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-pipe-card border-r border-pipe-border z-40">
        <div className="px-5 py-6">
          <Link href="/prospeccao" className="font-display text-2xl text-white">
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
              {orgNome && orgNome !== perfil?.nome_empresa && (
                <p className="text-[11px] text-pipe-muted truncate">
                  🏢 {orgNome}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-pipe-muted truncate">
                  {perfil?.produtos_servicos ? "✏️ Editar perfil" : "⚠️ Perfil incompleto"}
                </p>
                {orgPapel && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      orgPapel === "admin"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {orgPapel === "admin" ? "Admin" : "Membro"}
                  </span>
                )}
              </div>
            </div>
          </button>

          {saldoCreditos !== null && (
            <p className="mt-3 px-1 text-[11px] text-pipe-muted">
              🔎 Buscas:{" "}
              <span className="text-pipe-lime font-bold">{saldoCreditos}</span>
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {item(
            "/prospeccao",
            "Nova prospecção",
            "🎯",
            pathname === "/prospeccao"
          )}
          {item("/listas", "Minhas listas", "📋", pathname === "/listas")}
          {item(
            "/crm",
            "CRM",
            "🗂️",
            pathname === "/crm" || pathname.startsWith("/crm/")
          )}
          {crmResumo && crmResumo.total > 0 && (
            <div className="ml-4 py-1.5 px-4 bg-pipe-dark/60 border border-pipe-border/60 rounded-lg mb-1.5">
              <Link
                href="/crm"
                className="flex items-center justify-between text-[11px] font-bold text-pipe-blue hover:text-white transition"
              >
                <span>Pipeline</span>
                <span className="text-white">{crmResumo.total} lead(s)</span>
              </Link>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {crmResumo.porEstagio.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pipe-card border border-pipe-border text-gray-300"
                  >
                    {s.nome}: {s.total}
                  </span>
                ))}
              </div>
            </div>
          )}
          {temBuscador === false ? (
            <button
              key="/disparos"
              onClick={() => setPopupDisparosAberto(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition text-gray-400 hover:bg-pipe-dark hover:text-white border border-dashed border-pipe-border"
            >
              <span>✉️</span>
              Disparos em massa
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-pipe-lime/15 text-pipe-lime px-1.5 py-0.5 rounded">
                Gold
              </span>
            </button>
          ) : (
            <Link
              key="/disparos"
              href="/disparos"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                pathname === "/disparos"
                  ? "bg-pipe-blue/10 text-pipe-blue border border-pipe-blue/30"
                  : "text-gray-300 hover:bg-pipe-dark hover:text-white border border-transparent"
              }`}
            >
              <span>✉️</span>
              Disparos em massa
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-pipe-lime/15 text-pipe-lime px-1.5 py-0.5 rounded">
                Gold
              </span>
            </Link>
          )}
          {itemBuscador()}
          {item("/modelos", "Modelos", "⭐", pathname === "/modelos")}
          {item("/equipe", "Equipe", "👥", pathname === "/equipe")}
          {ehAdmin && (
            <>
              {item("/admin", "Admin · Usuários", "👑", pathname === "/admin")}
              {item("/admin/uso", "Admin · Uso de APIs", "📊", pathname === "/admin/uso")}
            </>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <span>🏠</span>
            <span>Início</span>
            <span className="ml-auto text-[10px] text-slate-400">↗</span>
          </a>
        </div>

        <div className="px-4 pb-5 space-y-1">
          <Link
            href="/creditos"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              pathname === "/creditos"
                ? "bg-pipe-lime/10 text-pipe-lime border border-pipe-lime/30"
                : "text-gray-300 hover:bg-pipe-dark hover:text-white border border-transparent"
            }`}
          >
            <span>💳</span>
            Gerenciar meus créditos
          </Link>

          <button
            onClick={sair}
            className="w-full text-left text-xs font-semibold text-pipe-muted hover:text-red-400 transition px-4 py-2"
          >
            ⏻ Sair da conta
          </button>
        </div>
      </aside>

      {popupBuscadorAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPopupBuscadorAberto(false)}
        >
          <div
            className="bg-pipe-card border border-pipe-border rounded-2xl max-w-md w-full p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">🔎</div>
              <h2 className="font-display text-2xl text-white">
                Buscador de Contatos
              </h2>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed text-center">
              Encontre <strong className="text-white">e-mails</strong> e{" "}
              <strong className="text-white">telefones corporativos</strong>{" "}
              dos decisores direto do LinkedIn deles. Cole o perfil, e o FP Pipe
              descobre o contato comercial real — pronto pra abordagem.
            </p>

            <div className="bg-pipe-blue/10 border border-pipe-blue/30 rounded-xl p-4 text-sm text-gray-200 space-y-2">
              <p>✅ E-mail corporativo verificado</p>
              <p>✅ Telefone verificado</p>
              <p>✅ Nome, cargo e empresa completos</p>
              <p>✅ Salva automático na sua lista</p>
            </div>

            <p className="text-[12px] text-pipe-muted text-center">
              Disponível nos planos{" "}
              <strong className="text-pipe-lime">Gold</strong> e{" "}
              <strong className="text-pipe-lime">Platinum</strong>.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/planos"
                className="w-full bg-pipe-lime text-pipe-bg font-bold py-3 rounded-xl text-center text-sm hover:brightness-110 transition"
              >
                ⭐ Fazer upgrade para ter e-mails e telefones verificados do LinkedIn
              </Link>
              <button
                onClick={() => setPopupBuscadorAberto(false)}
                className="text-xs text-pipe-muted hover:text-white transition"
              >
                Talvez depois
              </button>
            </div>
          </div>
        </div>
      )}

      {popupDisparosAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPopupDisparosAberto(false)}
        >
          <div
            className="bg-pipe-card border border-pipe-border rounded-2xl max-w-md w-full p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">✉️</div>
              <h2 className="font-display text-2xl text-white">
                Disparos em Massa
              </h2>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed text-center">
              Dispare <strong className="text-white">e-mails personalizados</strong>{" "}
              em massa para as empresas da sua lista, com abordagem gerada por IA
              e acompanhamento de quem abriu e respondeu — tudo automático.
            </p>

            <div className="bg-pipe-blue/10 border border-pipe-blue/30 rounded-xl p-4 text-sm text-gray-200 space-y-2">
              <p>✅ Envio em massa com mensagens personalizadas</p>
              <p>✅ Abordagens geradas por IA por empresa</p>
              <p>✅ Acompanhe envios, aberturas e respostas</p>
              <p>✅ Conecte seu Gmail, Outlook ou Zoho</p>
            </div>

            <p className="text-[12px] text-pipe-muted text-center">
              Disponível nos planos{" "}
              <strong className="text-pipe-lime">Gold</strong> (até 100/dia) e{" "}
              <strong className="text-pipe-lime">Platinum</strong> (até 300/dia).
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/planos"
                className="w-full bg-pipe-lime text-pipe-bg font-bold py-3 rounded-xl text-center text-sm hover:brightness-110 transition"
              >
                ⭐ Fazer upgrade para ativar o disparo em massa
              </Link>
              <button
                onClick={() => setPopupDisparosAberto(false)}
                className="text-xs text-pipe-muted hover:text-white transition"
              >
                Talvez depois
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
