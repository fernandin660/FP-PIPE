"use client";

import { useState } from "react";
import { Aviso, BotaoPrimario, BotaoSecundario, EntradaCampo, Janela, Rotulo, classeCampo } from "./ui";
import { useCamposPersonalizados } from "./useCamposPersonalizados";
import SeletorOrganizacao from "./SeletorOrganizacao";

export default function NovaPessoa({
  aberta,
  aoFechar,
  aoCriar,
  organizacao,
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoCriar: (id: string) => void;
  organizacao?: { id: string; nome: string } | null;
}) {
  const campos = useCamposPersonalizados("pessoa");
  const [f, setF] = useState({ nome: "", cargo: "", email: "", telefone: "", linkedin_url: "" });
  const [org, setOrg] = useState<{ id: string; nome: string } | null>(organizacao ?? null);
  const [extras, setExtras] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const mudar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm/pessoas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, organizacao_id: org?.id ?? null, campos: extras }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível cadastrar.");
      aoCriar(d.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Janela aberta={aberta} titulo="Nova pessoa" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rotulo htmlFor="p-nome">Nome *</Rotulo>
            <input id="p-nome" required autoFocus value={f.nome} onChange={mudar("nome")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="p-cargo">Cargo</Rotulo>
            <input id="p-cargo" value={f.cargo} onChange={mudar("cargo")} className={classeCampo} />
          </div>
          <div>
            <Rotulo>Organização</Rotulo>
            {organizacao ? (
              <p className="rounded-lg border border-pipe-border bg-pipe-bg px-3 py-2.5 text-sm text-pipe-ink">{organizacao.nome}</p>
            ) : (
              <SeletorOrganizacao valor={org} aoEscolher={setOrg} />
            )}
          </div>
          <div>
            <Rotulo htmlFor="p-email">E-mail</Rotulo>
            <input id="p-email" type="email" value={f.email} onChange={mudar("email")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="p-tel">Telefone</Rotulo>
            <input id="p-tel" type="tel" value={f.telefone} onChange={mudar("telefone")} className={classeCampo} />
          </div>
          <div className="sm:col-span-2">
            <Rotulo htmlFor="p-li">LinkedIn</Rotulo>
            <input id="p-li" type="url" placeholder="https://www.linkedin.com/in/…" value={f.linkedin_url} onChange={mudar("linkedin_url")} className={classeCampo} />
          </div>
          {campos.map((c) => (
            <div key={c.id} className={c.tipo === "texto_longo" ? "sm:col-span-2" : ""}>
              <Rotulo htmlFor={`p-c-${c.id}`}>{c.nome}</Rotulo>
              <EntradaCampo id={`p-c-${c.id}`} campo={c} valor={extras[c.id]} aoMudar={(v) => setExtras({ ...extras, [c.id]: v })} />
            </div>
          ))}
        </div>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="flex justify-end gap-2 pt-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando || !f.nome.trim()}>
            {salvando ? "Salvando…" : "Cadastrar"}
          </BotaoPrimario>
        </div>
      </form>
    </Janela>
  );
}
