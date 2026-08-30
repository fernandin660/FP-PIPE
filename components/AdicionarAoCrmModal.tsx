"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  const [responsavelId, setResponsavelId] = useState("");

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
        setStageId(dados.estagios?.[0]?.id ?? "");
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
      const resposta = await fetch("/api/crm/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: alvosAlvo,
          stage_id: stageId || undefined,
          responsavel_id: responsavelId || undefined,
          origem,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagemErro(dados?.erro || "Não conseguimos adicionar agora.");
        setEtapa("erro");
        return;
      }
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
        Verificando leads no CRM…
      </div>
    );
  } else if (etapa === "erro") {
    conteudo = (
      <div className="space-y-4">
        <p className="text-sm text-red-400">{mensagemErro}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={fechar}
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-gray-300 hover:bg-pipe-dark transition"
          >
            Fechar
          </button>
          <button
            onClick={() => void carregarPrecheck(alvosRef.current)}
            className="text-xs font-bold px-3 py-2 rounded-lg border border-pipe-blue text-pipe-blue hover:bg-pipe-blue/10 transition"
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
          <div className="text-4xl mb-2">✅</div>
          <p className="text-white font-semibold">Adicionadas ao CRM!</p>
          {precheck && (
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
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-gray-300 hover:bg-pipe-dark transition"
          >
            Fechar
          </button>
          <a
            href="/crm"
            className="text-xs font-bold px-3 py-2 rounded-lg bg-pipe-lime text-black hover:opacity-90 transition"
          >
            → Ver no CRM
          </a>
        </div>
      </div>
    );
  } else {
    const jaExistentes = precheck?.jaExistem.length ?? 0;
    const novas = precheck?.novas ?? 0;
    conteudo = (
      <div className="space-y-4">
        {descricao && (
          <p className="text-sm text-pipe-muted leading-relaxed">{descricao}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
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
            <p className="text-2xl font-display text-gray-300 mt-1">
              {jaExistentes}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-pipe-muted font-semibold mb-1.5">
            Estágio inicial
          </label>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
          >
            {precheck?.estagios.map((s) => (
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
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
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
            className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-gray-300 hover:bg-pipe-dark transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => void confirmar()}
            disabled={enviando || novas === 0}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-pipe-lime text-black hover:opacity-90 transition disabled:opacity-50"
          >
            {enviando
              ? "Adicionando…"
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
          <h3 className="font-bold text-lg text-white">
            📥 Adicionar ao CRM
            {titulo ? (
              <span className="block text-xs font-semibold text-pipe-blue mt-0.5">
                {titulo}
              </span>
            ) : null}
          </h3>
          {etapa !== "sucesso" && (
            <button
              onClick={fechar}
              className="text-gray-400 hover:text-white transition text-lg leading-none"
              title="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {conteudo}
      </div>
    </div>
  );
}
