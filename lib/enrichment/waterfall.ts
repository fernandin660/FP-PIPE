// ============================================================
// Waterfall — aplica Cache → Provider A → B → C ... e PARA no
// primeiro resultado VÁLIDO. Nunca consome créditos dos providers
// posteriores quando um anterior validou. Resultado parcial não
// para a cascata (seguimos procurando algo melhor).
// ============================================================

import { registrarAttempt } from "./attempt";
import type { Custo } from "./cost";
import { estornar, reservar } from "./credits";
import type {
  Alvo,
  ContextoEnriquecimento,
  DadoTipo,
  Pedido,
  Provider,
  ResultadoEngine,
  ResultadoProvider,
} from "./types";

// Regra de validade por tipo: "achou algo" NÃO basta. Telefone só é
// válido se houver um número com tipo conhecido (não "unknown"); e-mail
// só é válido se houver um "verificado" (sugerido é parcial).
export function ehValido(tipo: DadoTipo, r: ResultadoProvider, pedido: Pedido): boolean {
  const d = r.dados;
  switch (tipo) {
    case "telefone":
      return (d?.telefones ?? []).some((t) => t.tipo !== "unknown");
    case "email":
      return (d?.emails ?? []).some((e) => e.tipo === "verificado");
    case "dados_cadastrais":
      return Object.keys(d?.cadastrais ?? {}).length > 0;
    case "cargo":
      return Boolean(d?.cargo);
    case "website":
      return Boolean(d?.website);
    case "linkedin_empresa":
      return Boolean(d?.linkedinEmpresa);
    case "socios":
      return (d?.socios ?? []).length > 0;
    default:
      return r.encontrado;
  }
}

export async function rodarWaterfall(
  pedido: Pedido,
  ctx: ContextoEnriquecimento,
  candidatos: Provider[],
  custoPorProvider: Map<string, Custo>
): Promise<ResultadoEngine> {
  const parciais: ResultadoProvider[] = [];

  for (const provider of candidatos) {
    const custo = custoPorProvider.get(provider.nome) ?? {
      moeda: "credito",
      creditos: 0,
      custo_estimado: 0,
      tabela_creditos: "creditos",
    };

    const reservado = await reservar(ctx.organizacao_id, custo);

    let resultado: ResultadoProvider;
    try {
      resultado = await provider.enrich(pedido, pedido.alvo);
    } catch (e) {
      resultado = {
        provider: provider.nome,
        requestId: `${pedido.tipo}:${pedido.alvo.chave ?? e}`,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: reservado,
        custoEstimado: custo.custo_estimado,
        moeda: custo.moeda,
        cacheHit: false,
        fonte: provider.nome,
        confianca: 0,
      };
    }

    // Consolida os créditos realmente consumidos (autorização ocorreu
    // apenas se a reserva foi confirmada e o resultado foi válido).
    const consumiu = reservado > 0 && resultado.ok && resultado.encontrado ? reservado : 0;
    resultado.creditoConsumido = consumiu;

    if (consumiu < reservado) {
      await estornar(ctx.organizacao_id, custo, reservado - consumiu);
    }

    await registrarAttempt(
      ctx,
      resultado,
      pedido.alvo,
      pedido.tipo,
      custo.custo_estimado,
      resultado.erro ?? null,
      custo.moeda
    );

    // Resultado válido → pára (não chama os próximos, não paga mais).
    if (resultado.ok && resultado.encontrado && ehValido(pedido.tipo, resultado, pedido)) {
      return {
        ok: true,
        tipo: pedido.tipo,
        alvo: pedido.alvo,
        fonte: resultado.fonte,
        confianca: resultado.confianca,
        cacheHit: false,
        custoEstimado: custo.custo_estimado,
        creditoConsumido: consumiu,
        moeda: custo.moeda,
        dados: resultado.dados,
      };
    }

    parciais.push(resultado);
  }

  // Nenhum proveou resultado válido: devolve melhor parcial (auditável).
  const parcial = parciais.find((p) => p.ok && p.encontrado) ?? parciais[0];
  return {
    ok: false,
    tipo: pedido.tipo,
    alvo: pedido.alvo,
    fonte: parcial?.fonte ?? null,
    confianca: parcial?.confianca ?? 0,
    cacheHit: false,
    custoEstimado: 0,
    creditoConsumido: 0,
    moeda: "credito",
    dados: parcial?.dados,
    parciais,
  };
}
