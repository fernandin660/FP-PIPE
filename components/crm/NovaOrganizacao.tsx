"use client";

import { useState } from "react";
import { Aviso, BotaoPrimario, BotaoSecundario, EntradaCampo, Janela, Rotulo, classeCampo } from "./ui";
import { useCamposPersonalizados } from "./useCamposPersonalizados";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export default function NovaOrganizacao({
  aberta,
  aoFechar,
  aoCriar,
  nomeInicial = "",
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoCriar: (id: string, nome: string) => void;
  nomeInicial?: string;
}) {
  const campos = useCamposPersonalizados("organizacao");
  const [f, setF] = useState({ nome: nomeInicial, cnpj: "", website: "", telefone: "", email: "", municipio: "", uf: "", segmento: "" });
  const [extras, setExtras] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const mudar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm/organizacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, campos: extras }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível cadastrar.");
      aoCriar(d.id, f.nome);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Janela aberta={aberta} titulo="Nova organização" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <Rotulo htmlFor="org-nome">Nome *</Rotulo>
          <input id="org-nome" required autoFocus value={f.nome} onChange={mudar("nome")} className={classeCampo} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="org-cnpj">CNPJ</Rotulo>
            <input id="org-cnpj" inputMode="numeric" value={f.cnpj} onChange={mudar("cnpj")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="org-segmento">Segmento</Rotulo>
            <input id="org-segmento" value={f.segmento} onChange={mudar("segmento")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="org-tel">Telefone</Rotulo>
            <input id="org-tel" type="tel" value={f.telefone} onChange={mudar("telefone")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="org-email">E-mail</Rotulo>
            <input id="org-email" type="email" value={f.email} onChange={mudar("email")} className={classeCampo} />
          </div>
          <div className="sm:col-span-2">
            <Rotulo htmlFor="org-site">Site</Rotulo>
            <input id="org-site" type="url" placeholder="https://" value={f.website} onChange={mudar("website")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="org-cidade">Cidade</Rotulo>
            <input id="org-cidade" value={f.municipio} onChange={mudar("municipio")} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="org-uf">Estado / país</Rotulo>
            <input id="org-uf" list="org-ufs" value={f.uf} onChange={mudar("uf")} className={classeCampo} />
            <datalist id="org-ufs">
              {UFS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          {campos.map((c) => (
            <div key={c.id} className={c.tipo === "texto_longo" ? "sm:col-span-2" : ""}>
              <Rotulo htmlFor={`org-c-${c.id}`}>{c.nome}</Rotulo>
              <EntradaCampo id={`org-c-${c.id}`} campo={c} valor={extras[c.id]} aoMudar={(v) => setExtras({ ...extras, [c.id]: v })} />
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
