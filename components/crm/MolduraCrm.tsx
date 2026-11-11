"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../Sidebar";
import ModalPerfil, { type PerfilVendedor } from "../ModalPerfil";

const ABAS = [
  { href: "/crm", rotulo: "Negócios" },
  { href: "/crm/organizacoes", rotulo: "Organizações" },
  { href: "/crm/pessoas", rotulo: "Contatos" },
  { href: "/hoje", rotulo: "Atividades" },
  { href: "/crm/configuracoes", rotulo: "Configurações" },
];

/** Menu lateral + abas do CRM + carga do perfil (comum às telas do CRM). */
export default function MolduraCrm({
  titulo,
  acoes,
  children,
  largura = "max-w-7xl",
}: {
  titulo: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  largura?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  useEffect(() => {
    async function iniciar() {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const [{ data: dadosPerfil }, { data: dadosCreditos }] = await Promise.all([
        supabase
          .from("perfil")
          .select("nome_empresa, area_atuacao, departamento_uso, produtos_servicos, site, foto_url, anexos, nichos")
          .eq("usuario_id", user.id)
          .maybeSingle(),
        supabase.from("creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
      ]);
      setPerfil((dadosPerfil as PerfilVendedor) ?? null);
      setSaldoCreditos(dadosCreditos?.saldo ?? null);
    }
    void iniciar();
  }, [router, pathname]);

  return (
    <>
      <Sidebar perfil={perfil} saldoCreditos={saldoCreditos} aoAbrirPerfil={() => setModalPerfilAberto(true)} />
      <ModalPerfil
        key={`perfil-crm-${modalPerfilAberto}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />
      <main className="min-h-screen bg-pipe-bg px-5 pb-16 pt-8 sm:px-8 lg:pl-72 lg:pr-10">
        <div className={`mx-auto ${largura}`}>
          <AbasCrm />
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-medium tracking-[-0.03em] text-pipe-ink">{titulo}</h1>
            {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
          </div>
          {children}
        </div>
      </main>
    </>
  );
}

/** Abas do CRM (Negócios, Organizações, Pessoas, Atividades, Configurações). */
export function AbasCrm() {
  const pathname = usePathname();
  const ativa = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav aria-label="Seções do CRM" className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-pipe-border">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={ativa(a.href) ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
            ativa(a.href)
              ? "border-pipe-ink font-medium text-pipe-ink"
              : "border-transparent text-pipe-muted hover:text-pipe-ink"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
