"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import { baixarCsv } from "../../lib/exportar-csv";
import { formatarCnpj } from "../../lib/conhecimento-cnae";
import {
  gerarLinkBuscaEmpresa,
  gerarLinkBuscaPessoas,
} from "../../lib/linkedin-links";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type AnexoPerfil,
  type PerfilVendedor,
} from "../../components/ModalPerfil";
import ModalAbordagem from "../../components/ModalAbordagem";

function montarPerfilVendedor(perfil: PerfilVendedor | null): string {
  if (!perfil?.nome_empresa && !perfil?.produtos_servicos) return "";

  const partes: string[] = [];

  if (perfil.nome_empresa) partes.push(`Empresa: ${perfil.nome_empresa}.`);

  if (perfil.area_atuacao) partes.push(`Área: ${perfil.area_atuacao}.`);

  if (perfil.site) partes.push(`Site: ${perfil.site}.`);

  if (perfil.nichos && perfil.nichos.length > 0) {
    partes.push(`Especialidades confirmadas: ${perfil.nichos.join("; ")}.`);
  }

  if (perfil.produtos_servicos) {
    partes.push(`Vendemos: ${perfil.produtos_servicos}`);
  }

  ((perfil.anexos ?? []) as AnexoPerfil[]).forEach((anexo) => {
    if (anexo.texto) {
      partes.push(`[Portfólio — ${anexo.nome}]: ${anexo.texto}`);
    }
  });

  return partes.join(" ");
}

type ListaSalva = {
  id: string;
  nome: string;
  segmentos: string[] | null;
  localizacao: string | null;
  icp_resumo: string | null;
  criado_em: string;
};

type ContatoPessoa = {
  id: string;
  company_id: string | null;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  emails: string[] | null;
  telefones: string[] | null;
  linkedin_url: string | null;
};

type EmpresaDaLista = {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  municipio: string | null;
  uf: string | null;
  segmento_icp: string | null;
  score: number | null;
  score_motivo: string | null;
  emails_extra?: string[] | null;
  telefones_extra?: string[] | null;
  telefone: string | null;
  email: string | null;
  linkedin: string | null;
  endereco: string | null;
  porte: string | null;
  capital_social: number | null;
  cargo_prioritario: string | null;
  decisor_nome: string | null;
  decisor_cargo: string | null;
  aprovador_linkedin: string | null;
  aprovador_telefone: string | null;
  aprovador_email: string | null;
  campeao_nome: string | null;
  campeao_cargo: string | null;
  campeao_linkedin: string | null;
  campeao_telefone: string | null;
  campeao_email: string | null;
  confirmado: boolean | null;
  origem: string | null;
  email_assunto: string | null;
  email_corpo: string | null;
  informacoes_adicionais: string | null;
};

export default function PaginaListas() {
  const router = useRouter();

  const [listas, setListas] = useState<ListaSalva[]>([]);
  const [empresasPorLista, setEmpresasPorLista] = useState<
    Record<string, EmpresaDaLista[]>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [empresaDetalhe, setEmpresaDetalhe] = useState<EmpresaDaLista | null>(
    null
  );
  const [filtroContato, setFiltroContato] = useState<"todos" | "com" | "sem">(
    "todos"
  );
  const [modalAbordagemAberto, setModalAbordagemAberto] = useState(false);
  const [edicaoLead, setEdicaoLead] = useState({
    nome: "",
    email: "",
    linkedin: "",
    infos: "",
  });
  const [salvandoLead, setSalvandoLead] = useState(false);
  const [leadSalvo, setLeadSalvo] = useState(false);
  const [contatosLead, setContatosLead] = useState<ContatoPessoa[]>([]);
  const [formContato, setFormContato] = useState({
    aberto: false,
    nome: "",
    cargo: "",
    emails: "",
    telefones: "",
    linkedin: "",
  });
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [empresaContato, setEmpresaContato] = useState<{
    emails: string[];
    telefones: string[];
  }>({ emails: [], telefones: [] });
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [erroReceita, setErroReceita] = useState("");
  const [buscandoMaps, setBuscandoMaps] = useState(false);
  const [erroMaps, setErroMaps] = useState("");
  const [listaIcpResumo, setListaIcpResumo] = useState("");
  const [listaAtualId, setListaAtualId] = useState<string | null>(null);
  const [perfilVendedor, setPerfilVendedor] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const abrirDetalhe = (
    empresa: EmpresaDaLista,
    lista?: ListaSalva
  ) => {
    setEmpresaDetalhe(empresa);
    setListaIcpResumo(lista?.icp_resumo ?? "");
    setListaAtualId(lista?.id ?? null);
    setPerfilVendedor(
      lista?.icp_resumo || perfil?.produtos_servicos || ""
    );
    setEdicaoLead({
      nome: empresa.campeao_nome ?? "",
      email: empresa.campeao_email ?? "",
      linkedin: empresa.campeao_linkedin ?? "",
      infos: empresa.informacoes_adicionais ?? "",
    });
    setLeadSalvo(false);
    setFormContato((v) => ({ ...v, aberto: false }));
    setEmpresaContato({
      emails: [empresa.email, ...(empresa.emails_extra ?? [])].filter(
        (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
      ),
      telefones: [empresa.telefone, ...(empresa.telefones_extra ?? [])].filter(
        (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
      ),
    });
    setErroReceita("");
    setErroMaps("");
    void carregarContatosLead(empresa.id);
  };

  const aplicarContatoInstitucional = (
    companyId: string,
    dados: {
      email?: string | null;
      telefone?: string | null;
      emails_extra?: string[] | null;
      telefones_extra?: string[] | null;
    }
  ) => {
    const emails = [dados.email, ...(dados.emails_extra ?? [])].filter(
      (v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i
    );
    const telefones = [
      dados.telefone,
      ...(dados.telefones_extra ?? []),
    ]
      .filter((v): v is string => Boolean(v))
      .filter(
        (v, i, arr) =>
          arr.findIndex((o) => o.replace(/\D/g, "") === v.replace(/\D/g, "")) ===
          i
      );

    setEmpresaContato({ emails, telefones });
    setEmpresaDetalhe((prev) =>
      prev
        ? {
            ...prev,
            email: dados.email ?? prev.email,
            telefone: dados.telefone ?? prev.telefone,
          }
        : prev
    );
    setEmpresasPorLista((prev) => {
      const novo = { ...prev };
      for (const listaId of Object.keys(novo)) {
        novo[listaId] = novo[listaId].map((e) =>
          e.id === companyId
            ? {
                ...e,
                email: dados.email ?? e.email,
                telefone: dados.telefone ?? e.telefone,
                emails_extra: (dados.emails_extra ?? e.emails_extra) as
                  | string[]
                  | null,
                telefones_extra: (dados.telefones_extra ??
                  e.telefones_extra) as string[] | null,
              }
            : e
        );
      }
      return novo;
    });
  };

  const buscarNaReceita = async () => {
    if (!empresaDetalhe || buscandoReceita) return;

    setBuscandoReceita(true);
    setErroReceita("");

    try {
      const resposta = await fetch("/api/enriquecer-receita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: empresaDetalhe.id }),
      });

      const dados = (await resposta.json()) as {
        empresa?: {
          email?: string | null;
          telefone?: string | null;
          emails_extra?: string[];
          telefones_extra?: string[];
        };
        erro?: string;
      };

      if (!resposta.ok || !dados.empresa) {
        setErroReceita(dados.erro ?? "Falha na consulta.");
        return;
      }

      aplicarContatoInstitucional(empresaDetalhe.id, dados.empresa);
    } finally {
      setBuscandoReceita(false);
    }
  };

  const buscarNoMaps = async () => {
    if (!empresaDetalhe || buscandoMaps) return;

    setBuscandoMaps(true);
    setErroMaps("");

    try {
      const resposta = await fetch("/api/buscar-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: empresaDetalhe.id }),
      });

      const dados = (await resposta.json()) as {
        empresa?: {
          email?: string | null;
          telefone?: string | null;
          emails_extra?: string[];
          telefones_extra?: string[];
        };
        erro?: string;
      };

      if (!resposta.ok || !dados.empresa) {
        setErroMaps(dados.erro ?? "Falha na consulta.");
        return;
      }

      aplicarContatoInstitucional(empresaDetalhe.id, dados.empresa);
    } finally {
      setBuscandoMaps(false);
    }
  };

  const carregarContatosLead = async (companyId: string) => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    const { data } = await supabase
      .from("contatos")
      .select(
        "id, nome, cargo, email, emails, telefones, linkedin_url"
      )
      .eq("company_id", companyId)
      .order("criado_em", { ascending: false });

    setContatosLead((data as ContatoPessoa[]) ?? []);
  };

  const adicionarContatoManual = async () => {
    if (!empresaDetalhe || salvandoContato) return;

    const emailsLista = formContato.emails
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    const telefonesLista = formContato.telefones
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter(Boolean);

    if (!formContato.nome.trim() && emailsLista.length === 0) return;

    setSalvandoContato(true);

    try {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: criado, error } = await supabase
        .from("contatos")
        .insert({
          usuario_id: user.id,
          company_id: empresaDetalhe.id,
          nome: formContato.nome.trim() || null,
          cargo: formContato.cargo.trim() || null,
          email: emailsLista[0] ?? null,
          emails: emailsLista,
          telefones: telefonesLista,
          linkedin_url: formContato.linkedin.trim() || null,
          origem: "manual",
        })
        .select()
        .single();

      if (!error && criado) {
        setContatosLead((atual) => [
          criado as ContatoPessoa,
          ...atual,
        ]);
        setFormContato({
          aberto: false,
          nome: "",
          cargo: "",
          emails: "",
          telefones: "",
          linkedin: "",
        });
      }
    } finally {
      setSalvandoContato(false);
    }
  };

  const removerContatoLead = async (id: string) => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.from("contatos").delete().eq("id", id);

    setContatosLead((atual) => atual.filter((c) => c.id !== id));
  };

  const salvarDadosLead = async () => {
    if (!empresaDetalhe || salvandoLead) return;

    setSalvandoLead(true);

    try {
      const supabase = criarClienteSupabase();

      const alteracoes = {
        campeao_nome: edicaoLead.nome.trim() || null,
        campeao_email: edicaoLead.email.trim() || null,
        campeao_linkedin: edicaoLead.linkedin.trim() || null,
        informacoes_adicionais: edicaoLead.infos.trim() || null,
      };

      if (supabase) {
        await supabase
          .from("companies")
          .update(alteracoes)
          .eq("id", empresaDetalhe.id);
      }

      const atualizada: EmpresaDaLista = { ...empresaDetalhe, ...alteracoes };
      setEmpresaDetalhe(atualizada);
      setLeadSalvo(true);

      setEmpresasPorLista((atual) => {
        const novo: Record<string, EmpresaDaLista[]> = {};

        Object.entries(atual).forEach(([listaId, emps]) => {
          novo[listaId] = emps.map((e) =>
            e.id === atualizada.id ? atualizada : e
          );
        });

        return novo;
      });
    } finally {
      setSalvandoLead(false);
    }
  };

  const salvarPerfilVendedor = async () => {
    if (!listaAtualId || salvandoPerfil) return;

    const texto = perfilVendedor.trim();
    if (!texto) return;

    setSalvandoPerfil(true);

    try {
      const supabase = criarClienteSupabase();

      if (supabase) {
        await supabase
          .from("listas")
          .update({ icp_resumo: texto })
          .eq("id", listaAtualId);
      }

      setListaIcpResumo(texto);
      setListas((atual) =>
        atual.map((l) =>
          l.id === listaAtualId ? { ...l, icp_resumo: texto } : l
        )
      );
    } catch (erroPerfil) {
      console.error("Erro ao salvar perfil do vendedor:", erroPerfil);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  useEffect(() => {
    if (!empresaDetalhe) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setEmpresaDetalhe(null);
    };

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [empresaDetalhe]);

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

      const { data: dadosListas } = await supabase
        .from("listas")
        .select("*")
        .order("criado_em", { ascending: false });

      const listasOrdenadas = (dadosListas as ListaSalva[]) ?? [];
      setListas(listasOrdenadas);

      if (listasOrdenadas.length > 0) {
        const { data: vinculos } = await supabase
          .from("lista_empresas")
          .select("lista_id, company:companies(*)")
          .in(
            "lista_id",
            listasOrdenadas.map((l) => l.id)
          );

        const agrupado: Record<string, EmpresaDaLista[]> = {};

        ((vinculos as unknown as Array<{
          lista_id: string;
          company: EmpresaDaLista | null;
        }>) ?? []).forEach((vinculo) => {
          if (!vinculo.company) return;
          agrupado[vinculo.lista_id] = agrupado[vinculo.lista_id] ?? [];
          agrupado[vinculo.lista_id].push(vinculo.company);
        });

        setEmpresasPorLista(agrupado);
      }

      setCarregando(false);
    }

    carregar();
  }, [router]);

  const exportarLista = async (lista: ListaSalva) => {
    const empresas = empresasPorLista[lista.id] ?? [];

    // Dossiê de contatos por empresa (todos os influenciadores registrados).
    const mapaContatos: Record<string, string> = {};

    if (empresas.length > 0) {
      const supabase = criarClienteSupabase();

      if (supabase) {
        const { data: pessoas } = await supabase
          .from("contatos")
          .select(
            "company_id, nome, cargo, email, emails, telefones"
          )
          .in(
            "company_id",
            empresas.map((e) => e.id)
          );

        ((pessoas as ContatoPessoa[] | null) ?? []).forEach((c) => {
          if (!c.company_id) return;

          const emailsPessoa =
            (c.emails?.length ?? 0) > 0
              ? c.emails!
              : c.email
                ? [c.email]
                : [];
          const partes = [
            c.nome || "Sem nome",
            c.cargo ? `(${c.cargo})` : "",
            emailsPessoa.join(" / "),
            (c.telefones ?? []).join(" / "),
          ].filter(Boolean);

          const linha = partes.join(" ").replace(/\s+/g, " ").trim();
          if (!linha) return;

          mapaContatos[c.company_id] = mapaContatos[c.company_id]
            ? `${mapaContatos[c.company_id]} || ${linha}`
            : linha;
        });
      }
    }

    baixarCsv(
      `${lista.nome.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase()}.csv`,
      [
        "Empresa",
        "CNPJ",
        "Endereço",
        "Cidade",
        "UF",
        "Segmento ICP",
        "Score",
        "Motivo do Score",
        "Telefone Empresa",
        "Email Empresa",
        "LinkedIn Empresa",
        "Aprovador Nome",
        "Aprovador Cargo",
        "Aprovador LinkedIn",
        "Aprovador Telefone",
        "Aprovador Email",
        "Influenciador Nome",
        "Influenciador Cargo",
        "Influenciador LinkedIn",
        "Influenciador Telefone",
        "Influenciador Email",
        "Confirmado",
        "Informacoes Adicionais",
        "Contatos do Lead",
      ],
      empresas.map((e) => [
        e.razao_social,
        e.cnpj,
        e.endereco,
        e.municipio,
        e.uf,
        e.segmento_icp,
        e.score,
        e.score_motivo,
        [e.telefone, ...(e.telefones_extra ?? [])]
          .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)
          .join("; "),
        [e.email, ...(e.emails_extra ?? [])]
          .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i)
          .join("; "),
        e.linkedin ||
          gerarLinkBuscaEmpresa(e.nome_fantasia, e.razao_social),
        e.decisor_nome,
        e.decisor_cargo,
        e.aprovador_linkedin ||
          gerarLinkBuscaPessoas(
            e.campeao_cargo || e.cargo_prioritario || "Comprador",
            e.nome_fantasia,
            e.razao_social
          ),
        e.aprovador_telefone,
        e.aprovador_email,
        e.campeao_nome,
        e.campeao_cargo,
        e.campeao_linkedin,
        e.campeao_telefone,
        e.campeao_email,
        e.confirmado ? "Sim" : "Nao",
        e.informacoes_adicionais,
        mapaContatos[e.id] ?? "",
      ])
    );
  };

  const apagarLista = async (lista: ListaSalva) => {
    if (
      !confirm(
        `Apagar a lista "${lista.nome}"?\n\nAs empresas continuam salvas no histórico — só o agrupamento desta rodada será removido.`
      )
    ) {
      return;
    }

    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.from("lista_empresas").delete().eq("lista_id", lista.id);
    await supabase.from("listas").delete().eq("id", lista.id);

    setListas((atual) => atual.filter((l) => l.id !== lista.id));

    setEmpresasPorLista((atual) => {
      const novo = { ...atual };
      delete novo[lista.id];
      return novo;
    });
  };

  const totalLeads = useMemo(
    () =>
      listas.reduce(
        (soma, lista) => soma + (empresasPorLista[lista.id]?.length ?? 0),
        0
      ),
    [listas, empresasPorLista]
  );

  function corDoScore(score: number): string {
    if (score >= 70)
      return "bg-lime-500/20 text-lime-400 border border-lime-500/40";
    if (score >= 40)
      return "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    return "bg-red-500/15 text-red-400 border border-red-500/40";
  }

  function temContato(e: EmpresaDaLista): boolean {
    return Boolean(
      e.campeao_email ||
        e.campeao_telefone ||
        e.campeao_linkedin ||
        e.aprovador_email ||
        e.aprovador_telefone ||
        e.aprovador_linkedin ||
        e.email ||
        (e.emails_extra?.length ?? 0) > 0 ||
        e.telefone ||
        (e.telefones_extra?.length ?? 0) > 0
    );
  }

  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />

      <ModalPerfil
        key={`perfil-${modalPerfilAberto}-${perfil?.produtos_servicos ? "ok" : "vazio"}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <ModalAbordagem
        aberto={modalAbordagemAberto}
        empresa={
          empresaDetalhe
            ? {
                id: empresaDetalhe.id,
                razao_social: empresaDetalhe.razao_social,
                nome_fantasia: empresaDetalhe.nome_fantasia,
                municipio: empresaDetalhe.municipio,
                uf: empresaDetalhe.uf,
                endereco: empresaDetalhe.endereco,
                segmento_icp: empresaDetalhe.segmento_icp,
                porte: empresaDetalhe.porte,
              }
            : null
        }
        aoFechar={() => setModalAbordagemAberto(false)}
      />

      <main className="min-h-screen bg-pipe-dark px-6 py-12 lg:pl-72">
        <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-3xl text-white">
            FP <span className="text-pipe-lime">Pipe</span>
          </Link>

          <Link
            href="/"
            className="bg-pipe-lime text-black font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition text-sm"
          >
            + Nova prospecção
          </Link>
        </div>

        <div className="flex items-end justify-between mt-10">
          <h1 className="font-display text-5xl text-white">Minhas listas</h1>

          {!carregando && listas.length > 0 && (
            <p className="text-pipe-muted text-sm">
              {listas.length} lista{listas.length > 1 ? "s" : ""} ·{" "}
              {totalLeads} lead{totalLeads !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {carregando ? (
          <p className="text-pipe-muted mt-6 animate-pulse">
            Carregando suas listas...
          </p>
        ) : listas.length === 0 ? (
          <div className="bg-pipe-card border border-pipe-border rounded-xl p-8 mt-6 text-center">
            <p className="text-white font-medium">
              Você ainda não tem nenhuma lista.
            </p>

            <p className="text-pipe-muted text-sm mt-2">
              Rode sua primeira prospecção — cada rodada cria uma lista aqui
              automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {listas.map((lista) => {
              const empresas = empresasPorLista[lista.id] ?? [];

              const comScore = empresas.filter(
                (e) => typeof e.score === "number"
              );
              const mediaScore =
                comScore.length > 0
                  ? Math.round(
                      comScore.reduce((s, e) => s + (e.score ?? 0), 0) /
                        comScore.length
                    )
                  : null;

              return (
                <div
                  key={lista.id}
                  className="bg-pipe-card border border-pipe-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-bold text-lg text-white">
                        {lista.nome}
                      </h2>

                      <p className="text-pipe-muted text-xs mt-1">
                        {empresas.length} leads
                        {mediaScore !== null ? ` · score médio ${mediaScore}` : ""}
                        {lista.localizacao ? ` · ${lista.localizacao}` : ""}
                        {" · "}
                        {new Date(lista.criado_em).toLocaleDateString("pt-BR")}
                      </p>

                      {lista.segmentos?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {lista.segmentos.map((s) => (
                            <span
                              key={s}
                              className="text-[10px] bg-pipe-dark border border-pipe-border text-gray-300 px-2 py-0.5 rounded-full"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => apagarLista(lista)}
                        title="Apagar esta lista"
                        className="border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
                      >
                        🗑️
                      </button>

                      {empresas.length > 0 && (
                        <button
                          onClick={() => void exportarLista(lista)}
                          className="border border-pipe-border text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-pipe-dark transition"
                        >
                          ⬇️ CSV
                        </button>
                      )}

                      {empresas.length > 0 && (
                        <button
                          onClick={() =>
                            setAberta(aberta === lista.id ? null : lista.id)
                          }
                          className="text-pipe-blue text-sm font-semibold hover:underline"
                        >
                          {aberta === lista.id ? "Fechar" : "Ver leads"}
                        </button>
                      )}
                    </div>
                  </div>

                  {aberta === lista.id && (
                    <div className="mt-4 pt-4 border-t border-pipe-border">
                      {(() => {
                        const nComContato = empresas.filter(temContato).length;
                        // Só expõe a camada de contato depois do primeiro
                        // contato conquistado — lista virgem não deve parecer ruim.
                        const filtroAtivo =
                          nComContato > 0 ? filtroContato : "todos";

                        return (
                          <>
                            {nComContato > 0 && (
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                {(
                                  [
                                    ["todos", `Todos (${empresas.length})`],
                                    [
                                      "com",
                                      `✅ Com contato (${nComContato})`,
                                    ],
                                    [
                                      "sem",
                                      `⚪ Sem contato (${
                                        empresas.length - nComContato
                                      })`,
                                    ],
                                  ] as const
                                ).map(([valor, rotulo]) => (
                                  <button
                                    key={valor}
                                    onClick={() => setFiltroContato(valor)}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                                      filtroAtivo === valor
                                        ? "bg-pipe-blue text-white"
                                        : "bg-pipe-dark text-pipe-muted hover:text-white border border-pipe-border"
                                    }`}
                                  >
                                    {rotulo}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="divide-y divide-pipe-border">
                              {empresas
                                .filter((e) =>
                                  filtroAtivo === "com"
                                    ? temContato(e)
                                    : filtroAtivo === "sem"
                                      ? !temContato(e)
                                      : true
                                )
                                .slice()
                                .sort(
                                  (a, b) =>
                                    Number(temContato(b)) -
                                      Number(temContato(a)) ||
                                    (b.score ?? -1) - (a.score ?? -1)
                                )
                        .map((empresa) => (
                          <div
                            key={empresa.id}
                            className="py-2.5 flex items-start gap-3"
                          >
                            {typeof empresa.score === "number" ? (
                              <span
                                className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${corDoScore(empresa.score)}`}
                              >
                                {empresa.score}
                              </span>
                            ) : (
                              <span className="shrink-0 w-10 h-10 rounded-lg bg-pipe-dark border border-pipe-border flex items-center justify-center text-pipe-muted text-xs">
                                —
                              </span>
                            )}

                            <div className="min-w-0">
                              <button
                                onClick={() => abrirDetalhe(empresa, lista)}
                                className="text-sm text-white font-medium truncate text-left hover:text-pipe-blue hover:underline transition"
                                title="Abrir ficha completa do lead"
                              >
                                {empresa.razao_social || "Sem razão social"}
                                {empresa.confirmado ? (
                                  <span className="ml-2 text-[10px] font-bold text-pipe-lime">
                                    ✔️ Confirmado
                                  </span>
                                ) : null}
                                {temContato(empresa) ? (
                                  <span
                                    className="ml-2 text-[10px] font-bold text-pipe-lime"
                                    title="Este lead já tem e-mail, telefone ou LinkedIn registrado"
                                  >
                                    ✅ Contato
                                  </span>
                                ) : null}
                              </button>

                              <p className="text-xs text-pipe-muted mt-0.5">
                                {[empresa.municipio, empresa.uf]
                                  .filter(Boolean)
                                  .join(", ") || "Brasil"}
                                {empresa.decisor_nome
                                  ? ` · 👤 ${empresa.decisor_nome}`
                                  : ""}
                                {empresa.campeao_cargo
                                  ? ` · 🎯 ${empresa.campeao_cargo}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {empresaDetalhe && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setEmpresaDetalhe(null)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-pipe-card border-l border-pipe-border overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-pipe-card border-b border-pipe-border px-6 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-white leading-snug">
                  {empresaDetalhe.razao_social || "Sem razão social"}
                </h2>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {typeof empresaDetalhe.score === "number" ? (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${corDoScore(empresaDetalhe.score)}`}
                    >
                      Score {empresaDetalhe.score}
                    </span>
                  ) : null}

                  {empresaDetalhe.confirmado ? (
                    <span className="text-[11px] font-bold text-pipe-lime">
                      ✔️ Confirmado
                    </span>
                  ) : null}

                  <span className="text-[11px] text-pipe-muted">
                    {empresaDetalhe.origem === "manual"
                      ? "📌 Lead manual"
                      : "🔎 Busca automática"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEmpresaDetalhe(null)}
                className="shrink-0 w-8 h-8 rounded-lg border border-pipe-border text-pipe-muted hover:text-white hover:bg-pipe-dark transition"
                title="Fechar (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <section>
                <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                  Empresa
                </p>

                <dl className="space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-pipe-muted w-32 shrink-0">CNPJ</dt>
                    <dd className="text-gray-200">
                      {formatarCnpj(empresaDetalhe.cnpj)}
                    </dd>
                  </div>

                  {empresaDetalhe.nome_fantasia ? (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">
                        Nome fantasia
                      </dt>
                      <dd className="text-gray-200">
                        {empresaDetalhe.nome_fantasia}
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <dt className="text-pipe-muted w-32 shrink-0">Endereço</dt>
                    <dd className="text-gray-200">
                      {empresaDetalhe.endereco ||
                        [empresaDetalhe.municipio, empresaDetalhe.uf]
                          .filter(Boolean)
                          .join(", ") ||
                        "—"}
                    </dd>
                  </div>

                  {empresaDetalhe.segmento_icp ? (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">
                        Segmento ICP
                      </dt>
                      <dd className="text-gray-200">
                        {empresaDetalhe.segmento_icp}
                      </dd>
                    </div>
                  ) : null}

                  {empresaDetalhe.porte ? (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">Porte</dt>
                      <dd className="text-gray-200">{empresaDetalhe.porte}</dd>
                    </div>
                  ) : null}

                  {typeof empresaDetalhe.capital_social === "number" ? (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">
                        Capital social
                      </dt>
                      <dd className="text-gray-200">
                        {empresaDetalhe.capital_social.toLocaleString(
                          "pt-BR",
                          { style: "currency", currency: "BRL" }
                        )}
                      </dd>
                    </div>
                  ) : null}

                  {empresaDetalhe.score_motivo ? (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">
                        Motivo do score
                      </dt>
                      <dd className="text-gray-300">
                        {empresaDetalhe.score_motivo}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="border-t border-pipe-border pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                  Contato da empresa
                </p>

                <div className="flex flex-col gap-1.5 text-sm">
                  {empresaDetalhe.telefone ? (
                    <a
                      href={`tel:${empresaDetalhe.telefone.replace(/\D/g, "")}`}
                      className="text-pipe-blue hover:underline"
                    >
                      📞 {empresaDetalhe.telefone}
                    </a>
                  ) : (
                    <span className="text-pipe-muted text-xs">
                      Sem telefone cadastrado
                    </span>
                  )}

                  {empresaDetalhe.email ? (
                    <a
                      href={`mailto:${empresaDetalhe.email}`}
                      className="text-pipe-blue hover:underline break-all"
                    >
                      ✉ {empresaDetalhe.email}
                    </a>
                  ) : null}

                  <a
                    href={
                      empresaDetalhe.linkedin ||
                      gerarLinkBuscaEmpresa(
                        empresaDetalhe.nome_fantasia,
                        empresaDetalhe.razao_social
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pipe-blue hover:underline"
                  >
                    🔗 LinkedIn da empresa →
                  </a>
                </div>
              </section>

              {(empresaDetalhe.decisor_nome ||
                empresaDetalhe.decisor_cargo ||
                empresaDetalhe.aprovador_linkedin ||
                empresaDetalhe.aprovador_telefone ||
                empresaDetalhe.aprovador_email) && (
                <section className="border-t border-pipe-border pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                    👤 Aprovador
                  </p>

                  <div className="flex flex-col gap-1.5 text-sm">
                    <p className="text-gray-200 font-medium">
                      {empresaDetalhe.decisor_nome || "Nome não identificado"}
                      {empresaDetalhe.decisor_cargo
                        ? ` · ${empresaDetalhe.decisor_cargo}`
                        : ""}
                    </p>

                    {empresaDetalhe.aprovador_linkedin ? (
                      <a
                        href={empresaDetalhe.aprovador_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pipe-blue hover:underline"
                      >
                        🔗 Perfil no LinkedIn →
                      </a>
                    ) : (
                      <a
                        href={gerarLinkBuscaPessoas(
                          empresaDetalhe.campeao_cargo ||
                            empresaDetalhe.cargo_prioritario ||
                            "Comprador",
                          empresaDetalhe.nome_fantasia,
                          empresaDetalhe.razao_social
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pipe-blue hover:underline"
                      >
                        🔎 Buscar no LinkedIn →
                      </a>
                    )}

                    {empresaDetalhe.aprovador_telefone ? (
                      <a
                        href={`tel:${empresaDetalhe.aprovador_telefone.replace(/\D/g, "")}`}
                        className="text-pipe-blue hover:underline"
                      >
                        📞 {empresaDetalhe.aprovador_telefone}
                      </a>
                    ) : null}

                    {empresaDetalhe.aprovador_email ? (
                      <a
                        href={`mailto:${empresaDetalhe.aprovador_email}`}
                        className="text-pipe-blue hover:underline break-all"
                      >
                        ✉ {empresaDetalhe.aprovador_email}
                      </a>
                    ) : null}
                  </div>
                </section>
              )}

              {(empresaDetalhe.campeao_nome ||
                empresaDetalhe.campeao_cargo ||
                empresaDetalhe.campeao_linkedin ||
                empresaDetalhe.campeao_telefone ||
                empresaDetalhe.campeao_email) && (
                <section className="border-t border-pipe-border pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                    🎯 Influenciador (quem recebe sua proposta)
                  </p>

                  <div className="flex flex-col gap-1.5 text-sm">
                    <p className="text-gray-200 font-medium">
                      {empresaDetalhe.campeao_nome ||
                        empresaDetalhe.campeao_cargo ||
                        "—"}
                    </p>

                    {empresaDetalhe.campeao_linkedin ? (
                      <a
                        href={empresaDetalhe.campeao_linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pipe-blue hover:underline"
                      >
                        🔗 Perfil no LinkedIn →
                      </a>
                    ) : null}

                    {empresaDetalhe.campeao_telefone ? (
                      <a
                        href={`tel:${empresaDetalhe.campeao_telefone.replace(/\D/g, "")}`}
                        className="text-pipe-blue hover:underline"
                      >
                        📞 {empresaDetalhe.campeao_telefone}
                      </a>
                    ) : null}

                    {empresaDetalhe.campeao_email ? (
                      <a
                        href={`mailto:${empresaDetalhe.campeao_email}`}
                        className="text-pipe-blue hover:underline break-all"
                      >
                        ✉ {empresaDetalhe.campeao_email}
                      </a>
                    ) : null}
                  </div>
                </section>
              )}

              <section className="border-t border-pipe-border pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-blue mb-2">
                  🤖 Abordagem com IA
                </p>

                {!listaIcpResumo && (
                  <div className="mb-3 bg-amber-500/5 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-300 font-semibold mb-1.5">
                      ⚠️ Esta lista foi criada antes de guardarmos o que sua
                      empresa vende — complete abaixo para abordagens mais
                      precisas.
                    </p>

                    <textarea
                      value={perfilVendedor}
                      onChange={(e) => setPerfilVendedor(e.target.value)}
                      rows={3}
                      placeholder="Ex.: Vendemos consultoria em cibersegurança para médias empresas: pentest, monitoramento de ameaças e adequação à LGPD."
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-400 resize-y mb-2"
                    />

                    <button
                      onClick={salvarPerfilVendedor}
                      disabled={salvandoPerfil || !perfilVendedor.trim()}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-black hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {salvandoPerfil
                        ? "Salvando..."
                        : "💾 Salvar nesta lista"}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setModalAbordagemAberto(true)}
                  className="w-full bg-pipe-blue/15 border border-pipe-blue text-pipe-blue text-xs font-bold py-2.5 rounded-lg hover:bg-pipe-blue/25 transition"
                >
                  🤖 Gerar abordagem com IA
                </button>

                <p className="mt-2 text-[11px] text-pipe-muted">
                  Escolha o produto, o objetivo e o canal — cada abordagem fica
                  salva no histórico deste lead.
                </p>
              </section>

              <section className="border-t border-pipe-border pt-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-blue">
                    🏢 Contato institucional da empresa
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void buscarNaReceita()}
                      disabled={buscandoReceita}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-pipe-blue/50 text-pipe-blue hover:bg-pipe-blue/10 disabled:opacity-50 transition"
                    >
                      {buscandoReceita
                        ? "Buscando..."
                        : "🔍 Receita Federal"}
                    </button>

                    <button
                      onClick={() => void buscarNoMaps()}
                      disabled={buscandoMaps}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-pipe-blue/50 text-pipe-blue hover:bg-pipe-blue/10 disabled:opacity-50 transition"
                    >
                      {buscandoMaps ? "Buscando..." : "🗺️ Google Maps"}
                    </button>
                  </div>
                </div>

                {erroReceita && (
                  <p className="text-xs text-red-400 mb-2">{erroReceita}</p>
                )}
                {erroMaps && (
                  <p className="text-xs text-red-400 mb-2">{erroMaps}</p>
                )}

                <div className="space-y-1 text-xs">
                  {empresaContato.emails.length > 0 ? (
                    empresaContato.emails.map((mail) => (
                      <a
                        key={mail}
                        href={`mailto:${mail}`}
                        className="block text-pipe-lime hover:underline break-all"
                      >
                        ✉️ {mail}
                      </a>
                    ))
                  ) : (
                    <p className="text-pipe-muted">✉️ —</p>
                  )}

                  {empresaContato.telefones.length > 0 ? (
                    empresaContato.telefones.map((tel) => (
                      <a
                        key={tel}
                        href={`tel:${tel.replace(/[^\d+]/g, "")}`}
                        className="block text-white hover:text-pipe-lime"
                      >
                        📞 {tel}
                      </a>
                    ))
                  ) : (
                    <p className="text-pipe-muted">📞 —</p>
                  )}
                </div>
              </section>

              <section className="border-t border-pipe-border pt-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-blue">
                    👤 Contato do lead (editável)
                  </p>

                  <button
                    onClick={salvarDadosLead}
                    disabled={salvandoLead}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-pipe-lime text-black hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {salvandoLead
                      ? "Salvando..."
                      : leadSalvo
                        ? "✅ Salvo!"
                        : "💾 Salvar dados do lead"}
                  </button>
                </div>

                <p className="text-[11px] text-pipe-muted mb-3">
                  Preencha à mão ou busque o e-mail pelo{" "}
                  <Link href="/buscador" className="text-pipe-blue hover:underline">
                    Buscador de Contatos
                  </Link>{" "}
                  e atribua ao lead — aparece aqui automaticamente.
                </p>

                <div className="space-y-2">
                  <input
                    value={edicaoLead.nome}
                    onChange={(e) =>
                      setEdicaoLead((v) => ({ ...v, nome: e.target.value }))
                    }
                    placeholder="Nome do contato"
                    className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  />

                  <input
                    type="email"
                    value={edicaoLead.email}
                    onChange={(e) =>
                      setEdicaoLead((v) => ({ ...v, email: e.target.value }))
                    }
                    placeholder="E-mail do contato"
                    className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  />

                  <input
                    value={edicaoLead.linkedin}
                    onChange={(e) =>
                      setEdicaoLead((v) => ({ ...v, linkedin: e.target.value }))
                    }
                    placeholder="LinkedIn do contato (https://linkedin.com/in/...)"
                    className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  />

                  <textarea
                    value={edicaoLead.infos}
                    onChange={(e) =>
                      setEdicaoLead((v) => ({ ...v, infos: e.target.value }))
                    }
                    rows={3}
                    placeholder="Informações adicionais (contexto, objeções, histórico, anotações...)"
                    className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-gray-200 whitespace-pre-wrap focus:outline-none focus:border-pipe-blue resize-y"
                  />
                </div>
              </section>

              <section className="border-t border-pipe-border pt-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-blue">
                    👥 Contatos deste lead ({contatosLead.length})
                  </p>

                  <button
                    onClick={() =>
                      setFormContato((v) => ({ ...v, aberto: !v.aberto }))
                    }
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-pipe-blue/50 text-pipe-blue hover:bg-pipe-blue/10 transition"
                  >
                    {formContato.aberto ? "✕ Cancelar" : "＋ Adicionar contato"}
                  </button>
                </div>

                <p className="text-[11px] text-pipe-muted mb-3">
                  Dossiê completo do lead: influenciadores vindos do Buscador ou
                  cadastrados à mão, com todos os e-mails e telefones.
                </p>

                {formContato.aberto && (
                  <div className="mb-3 bg-pipe-dark/60 border border-pipe-border rounded-xl p-3 space-y-2">
                    <input
                      value={formContato.nome}
                      onChange={(e) =>
                        setFormContato((v) => ({ ...v, nome: e.target.value }))
                      }
                      placeholder="Nome"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                    />

                    <input
                      value={formContato.cargo}
                      onChange={(e) =>
                        setFormContato((v) => ({ ...v, cargo: e.target.value }))
                      }
                      placeholder="Cargo"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                    />

                    <textarea
                      value={formContato.emails}
                      onChange={(e) =>
                        setFormContato((v) => ({
                          ...v,
                          emails: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="E-mails (vários: separe por ; ou vírgula)"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue resize-y"
                    />

                    <textarea
                      value={formContato.telefones}
                      onChange={(e) =>
                        setFormContato((v) => ({
                          ...v,
                          telefones: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Telefones (vários: separe por ; ou vírgula)"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue resize-y"
                    />

                    <input
                      value={formContato.linkedin}
                      onChange={(e) =>
                        setFormContato((v) => ({
                          ...v,
                          linkedin: e.target.value,
                        }))
                      }
                      placeholder="LinkedIn (https://linkedin.com/in/...)"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                    />

                    <button
                      onClick={() => void adicionarContatoManual()}
                      disabled={
                        salvandoContato ||
                        (!formContato.nome.trim() && !formContato.emails.trim())
                      }
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-pipe-lime text-black hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {salvandoContato
                        ? "Salvando..."
                        : "💾 Salvar contato"}
                    </button>
                  </div>
                )}

                {contatosLead.length === 0 && !formContato.aberto && (
                  <p className="text-xs text-pipe-muted italic">
                    Nenhum contato registrado ainda para este lead.
                  </p>
                )}

                <ul className="space-y-2">
                  {contatosLead.map((c) => {
                    const emailsPessoa = c.emails?.length
                      ? c.emails
                      : c.email
                        ? [c.email]
                        : [];

                    return (
                      <li
                        key={c.id}
                        className="bg-pipe-dark/60 border border-pipe-border rounded-xl p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {c.nome ?? "Sem nome"}
                              {c.cargo && (
                                <span className="font-normal text-pipe-muted">
                                  {" "}
                                  · {c.cargo}
                                </span>
                              )}
                            </p>

                            {emailsPessoa.length > 0 && (
                              <p className="mt-1 text-xs break-all">
                                {emailsPessoa.map((mail, i) => (
                                  <span key={`${c.id}-m-${i}`}>
                                    {i > 0 && "; "}
                                    <a
                                      href={`mailto:${mail}`}
                                      className="text-pipe-lime hover:underline"
                                    >
                                      {mail}
                                    </a>
                                  </span>
                                ))}
                              </p>
                            )}

                            {(c.telefones?.length ?? 0) > 0 && (
                              <p className="mt-0.5 text-xs text-pipe-muted">
                                📞{" "}
                                {c.telefones?.map((t, i) => (
                                  <span key={`${c.id}-t-${i}`}>
                                    {i > 0 && " · "}
                                    <a
                                      href={`tel:${t.replace(/[^\d+]/g, "")}`}
                                      className="hover:text-white"
                                    >
                                      {t}
                                    </a>
                                  </span>
                                ))}
                              </p>
                            )}

                            {c.linkedin_url && (
                              <a
                                href={c.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-xs text-pipe-blue hover:underline"
                              >
                                LinkedIn ↗
                              </a>
                            )}
                          </div>

                          <button
                            onClick={() => void removerContatoLead(c.id)}
                            title="Remover contato"
                            className="shrink-0 w-7 h-7 rounded-lg text-pipe-muted hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            🗑
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
    </>
  );
}
