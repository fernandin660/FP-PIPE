"use client";

import { memo } from "react";
import { formatarCnpj } from "../lib/conhecimento-cnae";

import type { LeadCrm, EmpresaCrm } from "../app/crm/page";

const ROTULO_EVENTO: Record<string, string> = {
  lead_adicionado: "Adicionado ao pipeline",
  mudanca_estagio: "Mudança de estágio",
  responsavel_definido: "Responsável definido",
  lead_removido: "Removido do pipeline",
  atividade: "Atividade",
  atividade_programada: "Atividade programada (cadência)",
  cadencia_iniciada: "Cadência iniciada",
  oportunidade_atualizada: "Dados da oportunidade atualizados",
  disparo_enviado: "Disparo em massa (e-mail enviado)",
};

const COR_ATIVIDADE_STATUS: Record<string, string> = {
  atrasada: "#ef4444",
  hoje: "#eab308",
  sem: "#4b5563",
  futura: "#a2ff40",
};

const ROTULO_ATIVIDADE_STATUS: Record<string, string> = {
  atrasada: "Atividade atrasada",
  hoje: "Atividade para hoje",
  sem: "Sem atividade",
  futura: "Atividade programada no futuro",
};

function nomeEmpresa(e: EmpresaCrm | null): string {
  return (
    e?.nome_fantasia ||
    e?.razao_social ||
    (e?.cnpj ? formatarCnpj(e.cnpj) : "Empresa sem nome")
  );
}

function nomePessoa(lead: { company: EmpresaCrm | null }): string {
  const c = lead.company;
  return c?.campeao_nome ?? c?.decisor_nome ?? "Sem responsável na empresa";
}

function cargoPessoa(lead: { company: EmpresaCrm | null }): string | null {
  const c = lead.company;
  return c?.campeao_cargo ?? c?.decisor_cargo ?? c?.cargo_prioritario ?? null;
}

function corScore(score: number | null): string {
  if (score === null) return "bg-gray-500/20 text-gray-300";
  if (score >= 80) return "bg-pipe-lime/15 text-pipe-lime";
  if (score >= 50) return "bg-yellow-500/15 text-yellow-300";
  return "bg-red-500/15 text-red-300";
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nomeResponsavel(lead: { responsavel: { nome: string | null; email: string | null } | null }): string | null {
  if (lead.responsavel?.nome) return lead.responsavel.nome;
  if (lead.responsavel?.email) return lead.responsavel.email;
  return null;
}

type LeadCardProps = {
  lead: LeadCrm;
  modoMassa: boolean;
  selecionados: string[];
  arrastandoId: string | null;
  sobreStageId: string | null;
  sobreLeadId: string | null;
  arrastouRef: React.RefObject<boolean>;
  setArrastandoId: (id: string | null) => void;
  setSobreStageId: (id: string | null) => void;
  setSobreLeadId: (id: string | null) => void;
  onConcluirAtividade: (lead: LeadCrm) => void;
  onAbrirDetalhe: (lead: LeadCrm) => void;
  onAlternarSelecao: (id: string) => void;
};

function LeadCardComponent({
  lead,
  modoMassa,
  selecionados,
  arrastandoId,
  sobreStageId,
  sobreLeadId,
  arrastouRef,
  setArrastandoId,
  setSobreStageId,
  setSobreLeadId,
  onConcluirAtividade,
  onAbrirDetalhe,
  onAlternarSelecao,
}: LeadCardProps) {
  const c = lead.company;
  const responsavel = lead.responsavel?.nome ?? lead.responsavel?.email ?? null;
  const corBarra = COR_ATIVIDADE_STATUS[lead.atividade_status] ?? COR_ATIVIDADE_STATUS.sem;
  const selecionado = modoMassa && selecionados.includes(lead.id);

  return (
    <div
      key={lead.id}
      draggable={!modoMassa}
      onDragStart={(e) => {
        arrastouRef.current = true;
        setArrastandoId(lead.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", lead.id);
      }}
      onDragEnd={() => {
        setArrastandoId(null);
        setSobreStageId(null);
        setSobreLeadId(null);
      }}
      onClick={(e) => {
        if (arrastouRef.current) {
          arrastouRef.current = false;
          return;
        }
        if (modoMassa) {
          onAlternarSelecao(lead.id);
          return;
        }
        onAbrirDetalhe(lead);
      }}
      title={modoMassa ? undefined : ROTULO_ATIVIDADE_STATUS[lead.atividade_status]}
      style={{
        borderLeftWidth: 5,
        borderLeftColor: corBarra,
        contentVisibility: "auto",
        containIntrinsicSize: "0 180px",
      }}
      className={`group bg-pipe-bg border rounded-xl p-3 transition select-none ${
        arrastandoId === lead.id
          ? "opacity-40 border-pipe-blue"
          : selecionado
          ? "border-pipe-lime ring-2 ring-pipe-lime/50"
          : sobreLeadId === lead.id
          ? "border-pipe-lime ring-2 ring-pipe-lime/40"
          : "border-pipe-border hover:border-pipe-blue/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {modoMassa && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAlternarSelecao(lead.id);
            }}
            className={`mt-0.5 shrink-0 w-4 h-4 rounded-md border flex items-center justify-center text-[10px] leading-none transition ${
              selecionado
                ? "bg-pipe-lime border-pipe-lime text-pipe-bg"
                : "border-pipe-border bg-pipe-card"
            }`}
          >
            {selecionado ? "✓" : ""}
          </span>
        )}
        <p className="text-sm font-bold text-white leading-snug line-clamp-2 flex-1">
          {lead.company_inconsistente ? "Dados da empresa indisponíveis" : nomeEmpresa(c)}
        </p>
        {c?.score !== null && c?.score !== undefined ? (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${corScore(c.score)}`}
            title={c.score_motivo ?? undefined}
          >
            {c.score}
          </span>
        ) : null}
        {lead.prioridade && (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
              lead.prioridade.nivel === "alta"
                ? "bg-red-500/15 text-red-400"
                : lead.prioridade.nivel === "media"
                ? "bg-yellow-500/15 text-yellow-300"
                : "bg-gray-500/20 text-gray-300"
            }`}
            title={
              lead.prioridade.dadosInsuficientes
                ? "Prioridade: dados insuficientes"
                : `Prioridade ${lead.prioridade.rotulo} (${lead.prioridade.pontos}/100)`
            }
          >
            {lead.prioridade.rotulo}
          </span>
        )}
      </div>

      {(nomePessoa({ company: c }) !== "Sem responsável na empresa" || cargoPessoa({ company: c })) && (
        <p className="mt-1.5 text-xs text-pipe-muted line-clamp-1">
          {nomePessoa({ company: c })}
          {cargoPessoa({ company: c }) ? ` · ${cargoPessoa({ company: c })}` : ""}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-pipe-muted truncate">
          {c?.municipio ? `${c.municipio}${c.uf ? `-${c.uf}` : ""}` : c?.uf ?? "—"}
        </span>
        {responsavel ? (
          <span className="text-[11px] text-pipe-blue truncate">{responsavel}</span>
        ) : (
          <span className="text-[11px] text-pipe-muted">Sem responsável</span>
        )}
      </div>

      {lead.ultimo_evento && (
        <p className="mt-1.5 text-[10px] text-pipe-muted line-clamp-1">
          {ROTULO_EVENTO[lead.ultimo_evento.tipo_evento] ?? lead.ultimo_evento.tipo_evento}
          {lead.ultimo_evento.stage_destino_nome ? ` → ${lead.ultimo_evento.stage_destino_nome}` : ""}
        </p>
      )}

      {lead.proxima_atividade && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] text-pipe-muted flex items-center gap-1 min-w-0">
            <span className="truncate">{lead.proxima_atividade.titulo}</span>
            <span className="shrink-0">
              · {formatarData(lead.proxima_atividade.data_hora_atividade)}
            </span>
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConcluirAtividade(lead);
            }}
            title="Concluir atividade"
            className="shrink-0 text-[10px] font-bold bg-pipe-lime/15 text-pipe-lime border border-pipe-lime/30 px-1.5 py-0.5 rounded-md hover:bg-pipe-lime/25 transition"
          >
            Concluir
          </button>
        </div>
      )}

      {(lead.valor_oportunidade != null || lead.produto) && (
        <p className="mt-1.5 text-[10px] text-pipe-lime font-semibold line-clamp-1">
          {lead.valor_oportunidade != null
            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.valor_oportunidade)
            : ""}
          {lead.valor_oportunidade != null && lead.produto ? " · " : ""}
          {lead.produto ?? ""}
        </p>
      )}
    </div>
  );
}

export const LeadCard = memo(LeadCardComponent);