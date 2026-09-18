import Link from "next/link";

import { criarClienteSupabaseServidor } from "../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { DEFINICAO_PLANOS, type PlanoChave } from "../../lib/planos";

export const dynamic = "force-dynamic";

const EMAIL_ADMIN = (
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br"
).toLowerCase();

type UsuarioLinha = {
  id: string;
  email: string;
  criadoEm: string;
  ultimoLogin: string;
  plano: string;
  statusAssinatura: string;
  ciclo: string;
  saldoContatos: number | null;
  saldoIa: number | null;
  empresas: number;
};

export default async function Admin() {
  const supabase = await criarClienteSupabaseServidor();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? {
    data: { user: null },
  };

  const emailUsuario = user?.email?.toLowerCase() ?? "";

  if (!user || emailUsuario !== EMAIL_ADMIN) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center">
          <h1 className="font-display text-3xl text-white">404</h1>
          <p className="text-pipe-muted mt-2">
            Página não encontrada.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 text-sm border border-pipe-border rounded-lg px-4 py-2 text-white hover:border-pipe-blue transition"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  const admin = criarClienteSupabaseAdmin();

  let linhas: UsuarioLinha[] = [];

  if (admin) {
    const { data: listagem } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    });

    const [{ data: assinaturas }, { data: creditos }, { data: creditosIa }, {
      data: empresas,
    }, { data: membros }] = await Promise.all([
      admin.from("assinaturas").select("usuario_id, plano, status, ciclo"),
      admin.from("creditos").select("usuario_id, saldo"),
      admin.from("creditos_ia").select("usuario_id, saldo"),
      admin.from("companies").select("usuario_id"),
      admin.from("organizacao_membros").select("usuario_id, organizacao_id, status, papel"),
    ]);

    const mapaPlano = new Map<string, { plano: string; status: string; ciclo: string }>();
    for (const a of assinaturas ?? []) {
      if (!mapaPlano.has(a.usuario_id)) {
        mapaPlano.set(a.usuario_id, {
          plano: a.plano ?? "teste",
          status: a.status ?? "",
          ciclo: a.ciclo ?? "",
        });
      }
    }

    // Mapeia orgs com plano Gold/Platinum ativo
    const orgIdsDosMembros = [...new Set((membros ?? []).filter(m => m.status === "ativo").map(m => m.organizacao_id))];
    let orgsComPlanoPremium = new Map<string, string>(); // orgId -> plano (gold/platinum)
    
    if (orgIdsDosMembros.length > 0) {
      const { data: assinaturasOrgs } = await admin
        .from("assinaturas")
        .select("organizacao_id, plano, status")
        .in("organizacao_id", orgIdsDosMembros)
        .eq("status", "ativa");
      
      for (const a of assinaturasOrgs ?? []) {
        if (a.plano === "gold" || a.plano === "platinum") {
          orgsComPlanoPremium.set(a.organizacao_id, a.plano);
        }
      }
    }

    const mapaContatos = new Map<string, number>();
    for (const c of creditos ?? []) {
      mapaContatos.set(c.usuario_id, c.saldo ?? 0);
    }
    const mapaIa = new Map<string, number>();
    for (const c of creditosIa ?? []) {
      mapaIa.set(c.usuario_id, c.saldo ?? 0);
    }
    const contagemEmpresas = new Map<string, number>();
    for (const e of empresas ?? []) {
      contagemEmpresas.set(
        e.usuario_id,
        (contagemEmpresas.get(e.usuario_id) ?? 0) + 1
      );
    }

    // Mapa de usuário -> orgs ativas com papel
    const usuarioOrgsAtivas = new Map<string, Array<{ orgId: string; papel: string }>>();
    for (const m of membros ?? []) {
      if (m.status === "ativo") {
        const arr = usuarioOrgsAtivas.get(m.usuario_id) ?? [];
        arr.push({ orgId: m.organizacao_id, papel: m.papel });
        usuarioOrgsAtivas.set(m.usuario_id, arr);
      }
    }

    linhas = (listagem?.users ?? [])
      .map((u) => {
        const assinatura = mapaPlano.get(u.id);
        const orgsDoUsuario = usuarioOrgsAtivas.get(u.id) ?? [];
        
        // Procura a melhor org premium (prioriza onde é admin)
        let planoExibicao: string;
        let melhorOrg: { orgId: string; papel: string; plano: "gold" | "platinum" } | null = null;
        
        for (const org of orgsDoUsuario) {
          const planoOrg = orgsComPlanoPremium.get(org.orgId);
          if (planoOrg === "gold" || planoOrg === "platinum") {
            // Prioriza admin sobre membro
            if (!melhorOrg || (org.papel === "admin" && melhorOrg.papel !== "admin")) {
              melhorOrg = { orgId: org.orgId, papel: org.papel, plano: planoOrg };
            }
          }
        }

        if (melhorOrg) {
          const prefixo = melhorOrg.papel === "admin" ? "Adm do plano" : "Pertencente a equipe";
          const nomePlano = melhorOrg.plano === "gold" ? "Gold" : "Platinum";
          planoExibicao = `${prefixo} ${nomePlano}`;
        } else {
          planoExibicao =
            DEFINICAO_PLANOS[(assinatura?.plano ?? "") as PlanoChave]?.nome ??
            (assinatura?.plano ? assinatura.plano : "Teste grátis");
        }

        return {
          id: u.id,
          email: u.email ?? "(sem e-mail)",
          criadoEm: u.created_at
            ? new Date(u.created_at).toLocaleDateString("pt-BR")
            : "—",
          ultimoLogin: u.last_sign_in_at
            ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")
            : "—",
          plano: planoExibicao,
          statusAssinatura: assinatura?.status || "sem assinatura",
          ciclo: assinatura?.ciclo || "—",
          saldoContatos: mapaContatos.has(u.id)
            ? mapaContatos.get(u.id)!
            : null,
          saldoIa: mapaIa.has(u.id) ? mapaIa.get(u.id)! : null,
          empresas: contagemEmpresas.get(u.id) ?? 0,
        };
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  const totalUsuarios = linhas.length;
  const pagantes = linhas.filter(
    (l) =>
      l.statusAssinatura === "ativa" &&
      l.plano !== "Teste grátis" &&
      l.plano !== "teste"
  ).length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/prospeccao"
          className="inline-flex items-center gap-2 text-sm bg-pipe-card border border-pipe-border rounded-lg px-4 py-2 hover:border-pipe-blue/60 hover:text-white transition"
        >
          ← Voltar ao painel
        </Link>
        <Link
          href="/admin/uso"
          className="text-xs text-pipe-muted hover:text-white transition"
        >
          Painel de uso de APIs →
        </Link>
      </div>

      <p className="text-xs font-semibold text-pipe-blue tracking-widest uppercase mt-6">
        Console interno
      </p>
      <h1 className="font-display text-4xl text-white mt-1">
        Usuários do FP Pipe
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-pipe-card border border-pipe-border rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-pipe-muted font-bold">
            Total de usuários
          </p>
          <p className="font-display text-3xl text-white mt-2">
            {totalUsuarios}
          </p>
        </div>
        <div className="bg-pipe-card border border-pipe-border rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-pipe-muted font-bold">
            Assinaturas ativas
          </p>
          <p className="font-display text-3xl text-pipe-lime mt-2">
            {pagantes}
          </p>
        </div>
        <div className="bg-pipe-card border border-pipe-border rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-pipe-muted font-bold">
            Conversão
          </p>
          <p className="font-display text-3xl text-white mt-2">
            {totalUsuarios > 0
              ? `${Math.round((pagantes / totalUsuarios) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 bg-pipe-card border border-pipe-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-pipe-muted border-b border-pipe-border">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ciclo</th>
              <th className="px-4 py-3">Créd. contatos</th>
              <th className="px-4 py-3">Créd. IA</th>
              <th className="px-4 py-3">Empresas</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Último login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pipe-border/60">
            {linhas.map((linha) => (
              <tr key={linha.id} className="hover:bg-pipe-card/60">
                <td className="px-4 py-3 text-white">{linha.email}</td>
                <td className="px-4 py-3 text-gray-300">{linha.plano}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      linha.statusAssinatura === "ativa"
                        ? "bg-lime-500/15 text-lime-400"
                        : "bg-pipe-dark text-pipe-muted"
                    }`}
                  >
                    {linha.statusAssinatura}
                  </span>
                </td>
                <td className="px-4 py-3 text-pipe-muted">{linha.ciclo}</td>
                <td className="px-4 py-3 text-gray-300">
                  {linha.saldoContatos ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {linha.saldoIa ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">{linha.empresas}</td>
                <td className="px-4 py-3 text-pipe-muted">
                  {linha.criadoEm}
                </td>
                <td className="px-4 py-3 text-pipe-muted">
                  {linha.ultimoLogin}
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-pipe-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
