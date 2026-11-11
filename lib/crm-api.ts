import { NextResponse } from "next/server";

/** Lê o JSON do corpo; devolve null quando não é um objeto. */
export async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const corpo = await req.json();
    return corpo && typeof corpo === "object" && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export function somenteAdmin(papel: string) {
  return papel === "admin" ? null : erro("Só administradores podem fazer essa alteração.", 403);
}

/** Texto aparado e limitado; null quando vazio ou não é texto. */
export function texto(v: unknown, max: number): string | null {
  return typeof v === "string" ? v.trim().slice(0, max) || null : null;
}

export const COR_HEX = /^#[0-9a-fA-F]{6}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
