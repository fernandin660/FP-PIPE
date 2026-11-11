"use client";

import { useEffect, useState } from "react";
import type { CampoPersonalizado, EntidadeCampo } from "../../lib/crm-campos";

/** Carrega os campos personalizados da organização para uma entidade. */
export function useCamposPersonalizados(entidade: EntidadeCampo) {
  const [campos, setCampos] = useState<CampoPersonalizado[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch("/api/crm/campos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { campos: [] }))
      .then((d: { campos?: CampoPersonalizado[] }) => {
        if (vivo) setCampos((d.campos ?? []).filter((c) => c.entidade === entidade));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [entidade]);
  return campos;
}

/** Atraso para busca enquanto digita. */
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return atrasado;
}
