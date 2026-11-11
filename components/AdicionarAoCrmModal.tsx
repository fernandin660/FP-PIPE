"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { IconeVerificado } from "./Icones";

export type AlvosCrm = {
  cnpjs?: string[];
  company_ids?: string[];
  contact_ids?: string[];
};

type EstagioOpcao = {
  id: string;
  nome: string;
  cor: string;
  ordem_estagio: number;
  pipeline_id?: string;
};

type MembroOpcao = {
  usuario_id: string;
  nome: string | null;
  email: string | null;
};

type Precheck = {
  selecionadas: number;
  novas: number;
  jaExistem: string[];
  jaExistemPorFunil?: Record<string, string[]>;
  funis?: { id: string; nome: string }[];
  estagios: EstagioOpcao[];
  membros: MembroOpcao[];
};

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  alvos: AlvosCrm;
  origem: string;
  aoConcluido?: (resultado: { adicionadas: number; jaExistem: number }) => void;
};

export default function AdicionarAoCrmModal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  alvos,
  origem,
  aoConcluido,
}: Props) {
  const [precheck, setPrecheck] = useState<Precheck | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState<"carregando" | "form" | "sucesso" | "erro">(
    "carregando"
  );
  const [mensagemErro, setMensagemErro] = useState("");
  const [stageId, setStageId] = useState("");
  const [funilId, setFunilId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  // Funil de vendas (negócio) ou caixa de entrada (lead ainda não qualificado).
  const [destino, setDestino] = useState<"funil" | "caixa">("funil");
  const [resultadoCaixa, setResultadoCaixa] = useState<{ adicionadas: number; jaExistem: number } | null>(null);

  // Snapshot dos alvos no momento em que o modal abre, para que o precheck
  // rode apenas quando o modal transiciona de fechado -> aberto (e não a
  // cada re-render da página, já que `alvos` é recriado inline pelos pais).
  const alvosRef = useRef<AlvosCrm>(alvos);
  useEffect(() => {
    alvosRef.current = alvos;
  });

  const carregarPrecheck = useCallback(
    async (alvosAlvo: AlvosCrm) => {
      if (
        (alvosAlvo.cnpjs?.length ?? 0) === 0 &&
        (alvosAlvo.company_ids?.length ?? 0) === 0 &&
        (alvosAlvo.contact_ids?.length ?? 0) === 0
      ) {
        setPrecheck(null);
        setEtapa("form");
        return;
      }
      setEtapa("carregando");
      setPrecheck(null);
      try {
        const resposta = await fetch("/api/crm/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: alvosAlvo }),
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
          setMensagemErro(dados?.erro || "Não conseguimos verificar.");
          setEtapa("erro");
          return;
        }
        setPrecheck(dados);
        const primeiroFunil: string = dados.funis?.[0]?.id ?? "";
        setFunilId(primeiroFunil);
        setStageId(
          (dados.estagios as EstagioOpcao[] | undefined)?.find(
            (e) => !primeiroFunil || e.pipeline_id === primeiroFunil
          )?.id ?? ""
        );
        setResponsavelId("");
        setEtapa("form");
      } catch {
        setMensagemErro("Falha de conexão. Tente novamente.");
        setEtapa("erro");
      }
    },
    []
  );

  useEffect(() => {
    if (!aberto) return;
    void carregarPrecheck(alvosRef.current);
  }, [aberto, carregarPrecheck]);

  const confirmar = async () => {
    if (!precheck || enviando) return;
    const alvosAlvo = alvosRef.current ?? alvos;
    setEnviando(true);
    try {
      const resposta = await fetch(destino === "caixa" ? "/api/crm/leads" : "/api/crm/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          destino === "caixa"
            ? { payload: alvosAlvo, responsavel_id: responsavelId || undefined, origem }
            : {
                payload: alvosAlvo,
                stage_id: stageId || undefined,
                responsavel_id: responsavelId || undefined,
                origem,
              }
        ),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagemErro(dados?.erro || "Não conseguimos adicionar agora.");
        setEtapa("erro");
        return;
      }
      setResultadoCaixa(
        destino === "caixa" ? { adicionadas: dados.adicionadas ?? 0, jaExistem: (dados.jaExistem ?? []).length } : null
      );
      setEtapa("sucesso");
      aoConcluido?.({
        adicionadas: dados.adicionadas ?? 0,
        jaExistem: (dados.jaExistem ?? []).length,
      });
    } catch {
      setMensagemErro("Falha de conexão. Tente novamente.");
      setEtapa("erro");
    } finally {
      setEnviando(false);
    }
  };

  if (!aberto) return null;

  const fechar = () => {
    if (enviando) return;
    aoFechar();
  };

  let conteudo: ReactNode;

  if (etapa === "carregando") {
    conteudo = (
      <div className="flex flex-col items-center gap-3 py-6 text-sm text-pipe-muted">
        <div className="w-6 h-6 rounded-full border-2 border-pipe-blue border-t-transparent animate-spin" />
        Verificando empresas no CRM…
      </div>
    );
  } else if (etapa === "erro") {
    conteudo = (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{mensagemErro}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={fechar}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-pipe-ink-soft hover:bg-pipe-dark transition"
          >
            Fechar
          </button>
          <button
            onClick={() => void carregarPrecheck(alvosRef.current)}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-blue text-pipe-blue hover:bg-pipe-blue/10 transition"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  } else if (etapa === "sucesso") {
    conteudo = (
      <div className="space-y-4">
        <div className="text-center py-3">
          <IconeVerificado tamanho={40} className="mx-auto mb-2 text-pipe-lime" />
          <p className="text-pipe-ink font-semibold">
            {resultadoCaixa ? "Enviadas para a caixa de entrada." : "Adicionadas ao CRM."}
          </p>
          {resultadoCaixa ? (
            <p className="text-sm text-pipe-muted mt-1">
              {resultadoCaixa.adicionadas} novas
              {resultadoCaixa.jaExistem > 0 ? ` · ${resultadoCaixa.jaExistem} já estavam lá` : ""}
            </p>
          ) : precheck && (
            <p className="text-sm text-pipe-muted mt-1">
              {precheck.novas} novas {precheck.jaExistem.length > 0
                ? `· ${precheck.jaExistem.length} já existiam`
                : ""}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={fechar}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-pipe-ink-soft hover:bg-pipe-dark transition"
          >
            Fechar
          </button>
          <a
            href={resultadoCaixa ? "/crm/leads" : "/crm"}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-pipe-lime text-white hover:opacity-90 transition"
          >
            {resultadoCaixa ? "Ver caixa de entrada" : "Ver no CRM"}
          </a>
        </div>
      </div>
    );
  } else {
    // Duplicidade conta só no funil escolhido.
    const jaNoFunil =
      funilId && precheck?.jaExistemPorFunil
        ? precheck.jaExistemPorFunil[funilId] ?? []
        : precheck?.jaExistem ?? [];
    const jaExistentes = jaNoFunil.length;
    const novas = Math.max(0, (precheck?.selecionadas ?? 0) - jaExistentes);
    const etapasDoFunil = (precheck?.estagios ?? []).filter(
      (e) => !funilId || !e.pipeline_id || e.pipeline_id === funilId
    );
    conteudo = (
      <div className="space-y-4">
        {descricao && (
          <p className="text-sm text-pipe-muted leading-relaxed">{descricao}</p>
        )}

        <div role="radiogroup" aria-label="Destino" className="grid grid-cols-2 gap-1 rounded-full border border-pipe-border p-1 text-sm">
          {(
            [
              ["funil", "Funil de vendas"],
              ["caixa", "Caixa de entrada"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={destino === v}
              onClick={() => setDestino(v)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                destino === v ? "bg-pipe-ink font-medium text-white" : "text-pipe-muted hover:text-pipe-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {destino === "caixa" && (
          <p className="text-sm text-pipe-muted leading-relaxed">
            {precheck?.selecionadas ?? 0} empresa(s) entram como leads para qualificar antes de virar negócio. As que já estão na caixa de entrada são ignoradas.
          </p>
        )}

        {destino === "funil" && <div className="grid grid-cols-2 gap-3">
          <div className="bg-pipe-dark border border-pipe-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-pipe-muted font-semibold">
              Novas no CRM
            </p>
            <p className="text-2xl font-display text-pipe-lime mt-1">{novas}</p>
          </div>
          <div className="bg-pipe-dark border border-pipe-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-widest text-pipe-muted font-semibold">
              Já no CRM
            </p>
            <p className="text-2xl font-display text-pipe-ink-soft mt-1">
              {jaExistentes}
            </p>
          </div>
        </div>}

        {destino === "funil" && (precheck?.funis?.length ?? 0) > 1 && (
          <div>
            <label className="block text-xs text-pipe-muted font-semibold mb-1.5">
              Funil
            </label>
            <select
              value={funilId}
              onChange={(e) => {
                const novo = e.target.value;
                setFunilId(novo);
                setStageId(precheck?.estagios.find((s) => s.pipeline_id === novo)?.id ?? "");
              }}
              className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
            >
              {precheck?.funis?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div hidden={destino !== "funil"}>
          <label className="block text-xs text-pipe-muted font-semibold mb-1.5">
            Estágio inicial
          </label>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
          >
            {etapasDoFunil.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-pipe-muted font-semibold mb-1.5">
            Responsável
          </label>
          <select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
          >
            <option value="">Você (padrão)</option>
            {precheck?.membros.map((m) => (
              <option key={m.usuario_id} value={m.usuario_id}>
                {m.nome ?? m.email ?? "—"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 flex-wrap pt-1">
          <button
            onClick={fechar}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-pipe-ink-soft hover:bg-pipe-dark transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => void confirmar()}
            disabled={enviando || (destino === "caixa" ? (precheck?.selecionadas ?? 0) === 0 : novas === 0)}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-pipe-lime text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {enviando
              ? "Adicionando…"
              : destino === "caixa"
                ? `Mandar ${precheck?.selecionadas ?? 0} para a caixa de entrada`
                : novas === 0
                ? "Nada novo para adicionar"
                : `Adicionar ${novas} ao CRM`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-pipe-card border border-pipe-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-lg text-pipe-ink">
            Adicionar ao CRM
            {titulo ? (
              <span className="block text-xs font-semibold text-pipe-blue mt-0.5">
                {titulo}
              </span>
            ) : null}
          </h3>
          {etapa !== "sucesso" && (
            <button
              onClick={fechar}
              className="text-pipe-muted hover:text-pipe-ink transition text-lg leading-none"
              title="Fechar"
            >
              ×
            </button>
          )}
        </div>

        {conteudo}
      </div>
    </div>
  );
}
