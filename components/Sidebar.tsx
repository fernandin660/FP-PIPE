"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";
import type { PerfilVendedor } from "./ModalPerfil";
import {
  IconeAlvo,
  IconeBusca,
  IconeCaixa,
  IconeCartao,
  IconeCalendario,
  IconeCasa,
  IconeEmpresa,
  IconeEnviar,
  IconeEquipe,
  IconeEscrever,
  IconeEstrela,
  IconeGrafico,
  IconeLista,
  IconePasta,
  IconeSair,
  IconeSetaExterna,
  IconeVerificado,
} from "./Icones";

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

    router.push("/plataforma");
    router.refresh();
  }

  const item = (
    href: string,
    rotulo: string,
    icone: ReactNode,
    ativo: boolean
  ) => (
    <Link
      key={href}
      href={href}
      className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-left text-sm font-medium transition ${
        ativo
          ? "bg-[#111114] text-white border border-[#111114]"
          : "text-pipe-ink-soft hover:bg-pipe-dark hover:text-pipe-ink border border-transparent"
      }`}
    >
      <span>{icone}</span>
      {rotulo}
    </Link>
  );

  function itemBuscador() {
    const classes = `w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-left text-sm font-medium transition ${
      pathname === "/buscador" && temBuscador !== false
        ? "bg-[#111114] text-white border border-[#111114]"
        : temBuscador === false
          ? "text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink border border-dashed border-pipe-border"
          : "text-pipe-ink-soft hover:bg-pipe-dark hover:text-pipe-ink border border-transparent"
    }`;

    if (temBuscador === false) {
      return (
        <button
          key="/buscador"
          onClick={() => setPopupBuscadorAberto(true)}
          className={classes}
        >
          <IconeBusca className="w-4 h-4 text-pipe-muted shrink-0" />
          Buscador de contatos
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide border border-pipe-border text-pipe-muted px-1.5 py-0.5 rounded-full">
            Gold
          </span>
        </button>
      );
    }

    return item(
      "/buscador",
      "Buscador de contatos",
      <IconeBusca className="w-4 h-4 shrink-0" />,
      pathname === "/buscador"
    );
  }

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-[#fbfaf7] border-r border-pipe-border z-40">
        <div className="px-5 py-6">
          <Link href="/prospeccao" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-pipe-ink">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
            </svg>
            FP Pipe
          </Link>
        </div>

        <div className="px-4 pb-4 border-b border-pipe-border">
          <button
            onClick={aoAbrirPerfil}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-pipe-border hover:border-pipe-ink/30 transition text-left"
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
              <div className="w-11 h-11 rounded-full bg-pipe-blue/15 text-pipe-blue flex items-center justify-center font-semibold shrink-0">
                {inicial}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold text-pipe-ink truncate">
                {perfil?.nome_empresa || "Complete seu perfil"}
              </p>
              {orgNome && orgNome !== perfil?.nome_empresa && (
                <p className="text-[11px] text-pipe-muted truncate">
                  <IconeEmpresa className="w-3 h-3 inline-block mr-1" />
                  {orgNome}
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {perfil?.produtos_servicos ? (
                  <p className="inline-flex items-center gap-1 text-[11px] text-pipe-muted truncate">
                    <IconeEscrever className="w-3 h-3" />
                    Editar perfil
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-700 truncate">
                    Perfil incompleto
                  </p>
                )}
                {orgPapel && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      orgPapel === "admin"
                        ? "bg-yellow-500/20 text-amber-700"
                        : "bg-blue-500/20 text-blue-700"
                    }`}
                  >
                    {orgPapel === "admin" ? "Admin" : "Membro"}
                  </span>
                )}
              </div>
            </div>
          </button>

          {saldoCreditos !== null && (
            <p className="mt-3 px-1 text-[11px] text-pipe-muted flex items-center gap-1">
              <IconeBusca className="w-3 h-3 text-pipe-lime shrink-0" />
              Buscas:{" "}
              <span className="text-pipe-lime font-semibold">{saldoCreditos}</span>
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {item(
            "/hoje",
            "Hoje",
            <IconeCalendario className="w-4 h-4 shrink-0" />,
            pathname === "/hoje"
          )}
          {item(
            "/prospeccao",
            "Nova prospecção",
            <IconeAlvo className="w-4 h-4 shrink-0" />,
            pathname === "/prospeccao"
          )}
          {item(
            "/listas",
            "Minhas listas",
            <IconeLista className="w-4 h-4 shrink-0" />,
            pathname === "/listas"
          )}
          {item(
            "/metricas",
            "Dashboard",
            <IconeGrafico className="w-4 h-4 shrink-0" />,
            pathname === "/metricas"
          )}
          {item(
            "/crm",
            "CRM",
            <IconeEquipe className="w-4 h-4 shrink-0" />,
            pathname === "/crm" || pathname.startsWith("/crm/")
          )}
          {/* Atalhos do CRM */}
          <div className="ml-6 flex flex-col border-l border-pipe-border pl-2">
            {(
              [
                ["/crm/leads", "Caixa de entrada", null],
                ["/crm", "Negócios", crmResumo?.total ?? null],
                ["/crm/organizacoes", "Organizações", null],
                ["/crm/pessoas", "Contatos", null],
                ["/crm/relatorios", "Relatórios", null],
              ] as const
            ).map(([href, rotulo, total]) => {
              const ativo = href === "/crm" ? pathname === "/crm" || pathname === "/crm/lista" : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition ${
                    ativo ? "font-medium text-pipe-ink bg-pipe-dark" : "text-pipe-muted hover:text-pipe-ink hover:bg-pipe-dark/60"
                  }`}
                >
                  {rotulo}
                  {typeof total === "number" && total > 0 && (
                    <span className="text-[11px] tabular-nums text-pipe-muted">{total}</span>
                  )}
                </Link>
              );
            })}
          </div>
          {temBuscador === false ? (
            <button
              key="/disparos"
              onClick={() => setPopupDisparosAberto(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-left text-sm font-medium transition text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink border border-dashed border-pipe-border"
            >
              <IconeEnviar className="w-4 h-4 text-pipe-muted shrink-0" />
              Disparos em massa
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide border border-pipe-border text-pipe-muted px-1.5 py-0.5 rounded-full">
                Gold
              </span>
            </button>
          ) : (
            <Link
              key="/disparos"
              href="/disparos"
              className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-left text-sm font-medium transition ${
                pathname === "/disparos"
                  ? "bg-[#111114] text-white border border-[#111114]"
                  : "text-pipe-ink-soft hover:bg-pipe-dark hover:text-pipe-ink border border-transparent"
              }`}
            >
              <IconeEnviar className="w-4 h-4 shrink-0" />
              Disparos em massa
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide border border-pipe-border text-pipe-muted px-1.5 py-0.5 rounded-full">
                Gold
              </span>
            </Link>
          )}
          {itemBuscador()}
          {item(
            "/modelos",
            "Modelos/Cadências",
            <IconePasta className="w-4 h-4 shrink-0" />,
            pathname === "/modelos"
          )}
          {item(
            "/equipe",
            "Equipe",
            <IconeEstrela className="w-4 h-4 shrink-0" />,
            pathname === "/equipe"
          )}
          {item(
            "/produtos",
            "Produtos",
            <IconeCaixa className="w-4 h-4 shrink-0" />,
            pathname === "/produtos"
          )}
          {ehAdmin && (
            <>
              {item(
                "/admin",
                "Admin · Usuários",
                <IconeEquipe className="w-4 h-4 shrink-0" />,
                pathname === "/admin"
              )}
              {item(
                "/admin/uso",
                "Admin · Uso de APIs",
                <IconeGrafico className="w-4 h-4 shrink-0" />,
                pathname === "/admin/uso"
              )}
            </>
          )}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <a
            href="/plataforma"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-pipe-muted hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <IconeCasa className="w-4 h-4 text-pipe-muted shrink-0" />
            <span>Início</span>
            <IconeSetaExterna className="ml-auto w-3 h-3 text-pipe-muted" />
          </a>
        </div>

        <div className="px-4 pb-5 space-y-1">
          <Link
            href="/creditos"
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-left text-sm font-medium transition ${
              pathname === "/creditos"
                ? "bg-[#111114] text-white border border-[#111114]"
                : "text-pipe-ink-soft hover:bg-pipe-dark hover:text-pipe-ink border border-transparent"
            }`}
          >
            <IconeCartao className="w-4 h-4 shrink-0" />
            Gerenciar meus créditos
          </Link>

          <button
            onClick={sair}
            className="w-full text-left text-xs font-semibold text-pipe-muted hover:text-red-700 transition px-4 py-2"
          >
            <IconeSair className="w-4 h-4 inline-block mr-2" />
            Sair da conta
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
              <div className="flex justify-center mb-3">
                <IconeBusca tamanho={48} className="text-pipe-lime" />
              </div>
              <h2 className="font-display text-2xl text-pipe-ink">
                Buscador de contatos
              </h2>
            </div>

            <p className="text-pipe-ink-soft text-sm leading-relaxed text-center">
              Encontre <strong className="text-pipe-ink">e-mails</strong> e{" "}
              <strong className="text-pipe-ink">telefones corporativos</strong>{" "}
              dos decisores direto do LinkedIn deles. Cole o perfil, e o FP Pipe
              descobre o contato comercial real — pronto pra abordagem.
            </p>

            <div className="bg-pipe-blue/10 border border-pipe-blue/30 rounded-xl p-4 text-sm text-pipe-ink-soft space-y-2">
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                E-mail corporativo verificado
              </p>
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Telefone verificado
              </p>
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Nome, cargo e empresa completos
              </p>
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Salvo na sua lista automaticamente
              </p>
            </div>

            <p className="text-[12px] text-pipe-muted text-center">
              Disponível nos planos{" "}
              <strong className="text-pipe-lime">Gold</strong> e{" "}
              <strong className="text-pipe-lime">Platinum</strong>.
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/planos"
                className="w-full bg-pipe-lime text-white font-semibold py-3 rounded-xl text-center text-sm hover:brightness-110 transition"
              >
                Fazer upgrade para e-mails e telefones do LinkedIn
              </Link>
              <button
                onClick={() => setPopupBuscadorAberto(false)}
                className="text-xs text-pipe-muted hover:text-pipe-ink transition"
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
              <div className="flex justify-center mb-3">
                <IconeEnviar tamanho={48} className="text-pipe-lime" />
              </div>
              <h2 className="font-display text-2xl text-pipe-ink">
                Disparos em massa
              </h2>
            </div>

            <p className="text-pipe-ink-soft text-sm leading-relaxed text-center">
              Dispare e-mails em massa para as empresas da sua lista. A
              abordagem vem escrita para cada empresa, e você acompanha quem
              abriu e quem respondeu.
            </p>

            <div className="bg-pipe-blue/10 border border-pipe-blue/30 rounded-xl p-4 text-sm text-pipe-ink-soft space-y-2">
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Envio em massa com mensagens escritas para cada empresa
              </p>
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Acompanhe envios, aberturas e respostas
              </p>
              <p className="flex items-center gap-2">
                <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0" />
                Conecte seu Gmail, Outlook ou Zoho
              </p>
            </div>

            <p className="text-[12px] text-pipe-muted text-center">
              Disponível nos planos{" "}
              <strong className="text-pipe-lime">Gold</strong> (até 100/dia) e{" "}
              <strong className="text-pipe-lime">Platinum</strong> (até 300/dia).
            </p>

            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/planos"
                className="w-full bg-pipe-lime text-white font-semibold py-3 rounded-xl text-center text-sm hover:brightness-110 transition"
              >
                Fazer upgrade para ativar o disparo em massa
              </Link>
              <button
                onClick={() => setPopupDisparosAberto(false)}
                className="text-xs text-pipe-muted hover:text-pipe-ink transition"
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
