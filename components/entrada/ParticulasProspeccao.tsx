"use client";

import { useEffect, useRef, useState } from "react";
import { COBALTO, TINTA, distribuir, limitar, rng, type Forma, type Ponto } from "../studio/particulas";

/*
 * Animação da tela de entrada: o ciclo da prospecção em partículas.
 *   1. Telefone tocando  (contato de quem decide)
 *   2. Envelope          (primeira abordagem escrita)
 *   3. Funil             (oportunidades descendo até o contrato)
 * A cada troca a forma se fragmenta, as partículas se espalham e se
 * remontam na próxima. Fogem do cursor; um clique fragmenta na hora.
 */

export type FaseAnimacao = { titulo: string; texto: string };

const DURACAO_FASE = 4800; // ms
type Alvos = { normais: Ponto[]; destaque: Ponto[] };

function formasTelefone(cx: number, cy: number, s: number): { normais: Forma[]; destaque: Forma[] } {
  const w = s * 0.42;
  const h = s * 0.84;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const normais: Forma[] = [
    { tipo: "contorno", x, y, w, h, peso: 30 },
    { tipo: "cheio", x: cx - w * 0.14, y: y + h * 0.035, w: w * 0.28, h: h * 0.018, peso: 2 },
    { tipo: "circulo", cx, cy: y + h * 0.3, r: w * 0.17, peso: 9 },
    { tipo: "cheio", x: cx - w * 0.28, y: y + h * 0.43, w: w * 0.56, h: h * 0.035, peso: 6 },
    { tipo: "linha", x1: cx - w * 0.18, y1: y + h * 0.51, x2: cx + w * 0.18, y2: y + h * 0.51, peso: 2 },
    { tipo: "linha", x1: x + w * 0.42, y1: y + h * 0.955, x2: x + w * 0.58, y2: y + h * 0.955, peso: 1 },
  ];
  const destaque: Forma[] = [
    // Botão de atender
    { tipo: "disco", cx, cy: y + h * 0.78, r: w * 0.13, peso: 7 },
    // Ondas do toque, dos dois lados
    ...[0.2, 0.34, 0.48].flatMap((r, i): Forma[] => [
      { tipo: "arco", cx: x + w + w * 0.02, cy: y + h * 0.22, rx: w * r, ry: w * r, a0: -0.9, a1: 0.9, peso: 3 - i * 0.6 },
      { tipo: "arco", cx: x - w * 0.02, cy: y + h * 0.22, rx: w * r, ry: w * r, a0: Math.PI - 0.9, a1: Math.PI + 0.9, peso: 3 - i * 0.6 },
    ]),
  ];
  return { normais, destaque };
}

function formasEnvelope(cx: number, cy: number, s: number): { normais: Forma[]; destaque: Forma[] } {
  const w = s * 0.92;
  const h = s * 0.6;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const meio = { x: cx, y: y + h * 0.56 };
  const normais: Forma[] = [
    { tipo: "contorno", x, y, w, h, peso: 28 },
    { tipo: "linha", x1: x, y1: y, x2: meio.x, y2: meio.y, peso: 10 },
    { tipo: "linha", x1: x + w, y1: y, x2: meio.x, y2: meio.y, peso: 10 },
    { tipo: "linha", x1: x, y1: y + h, x2: x + w * 0.38, y2: y + h * 0.44, peso: 4 },
    { tipo: "linha", x1: x + w, y1: y + h, x2: x + w * 0.62, y2: y + h * 0.44, peso: 4 },
  ];
  const destaque: Forma[] = [
    // Resposta chegando: o selo de notificação no canto
    { tipo: "disco", cx: x + w, cy: y, r: s * 0.07, peso: 8 },
    // Rastro de envio
    { tipo: "linha", x1: x + w + s * 0.09, y1: y - s * 0.09, x2: x + w + s * 0.15, y2: y - s * 0.15, peso: 1.5 },
  ];
  return { normais, destaque };
}

type Funil = { topo: number; gargalo: number; base: number; larguraTopo: number; larguraGargalo: number; cx: number };

function geometriaFunil(cx: number, cy: number, s: number): Funil {
  return {
    cx,
    topo: cy - s * 0.42,
    gargalo: cy + s * 0.14,
    base: cy + s * 0.36,
    larguraTopo: s * 0.98,
    larguraGargalo: s * 0.15,
  };
}

function formasFunil(g: Funil, s: number): { normais: Forma[]; destaque: Forma[] } {
  const lt = g.larguraTopo / 2;
  const lg = g.larguraGargalo / 2;
  const meiaLargura = (y: number) => lt + (lg - lt) * ((y - g.topo) / (g.gargalo - g.topo));
  const normais: Forma[] = [
    { tipo: "arco", cx: g.cx, cy: g.topo, rx: lt, ry: s * 0.06, a0: 0, a1: Math.PI * 2, peso: 16 },
    { tipo: "linha", x1: g.cx - lt, y1: g.topo, x2: g.cx - lg, y2: g.gargalo, peso: 12 },
    { tipo: "linha", x1: g.cx + lt, y1: g.topo, x2: g.cx + lg, y2: g.gargalo, peso: 12 },
    { tipo: "linha", x1: g.cx - lg, y1: g.gargalo, x2: g.cx - lg, y2: g.base, peso: 4 },
    { tipo: "linha", x1: g.cx + lg, y1: g.gargalo, x2: g.cx + lg, y2: g.base, peso: 4 },
  ];
  // Etapas do funil
  [0.36, 0.68].forEach((f) => {
    const yy = g.topo + (g.gargalo - g.topo) * f;
    const m = meiaLargura(yy);
    normais.push({ tipo: "arco", cx: g.cx, cy: yy, rx: m, ry: s * 0.035, a0: 0, a1: Math.PI, peso: 4 });
  });
  const destaque: Forma[] = [
    // Contratos fechados, empilhados embaixo
    { tipo: "cheio", x: g.cx - s * 0.16, y: g.base + s * 0.05, w: s * 0.32, h: s * 0.045, peso: 5 },
    { tipo: "cheio", x: g.cx - lt * 0.8, y: g.topo - s * 0.02, w: lt * 1.6, h: s * 0.04, peso: 3 },
  ];
  return { normais, destaque };
}

export default function ParticulasProspeccao({ fases, rotulo }: { fases: FaseAnimacao[]; rotulo: string }) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const irParaRef = useRef<(f: number, origem?: Ponto) => void>(() => {});
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const caixa = caixaRef.current;
    const canvas = canvasRef.current;
    if (!caixa || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let largura = 0;
    let altura = 0;
    let dpr = 1;
    let escala = 0;
    let centro: Ponto = { x: 0, y: 0 };
    let funil: Funil | null = null;

    let n = 0;
    let nDestaque = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let tamanho = new Float32Array(0);
    let giro = new Float32Array(0);
    let semente = new Float32Array(0);
    let solta = new Float64Array(0); // até quando a partícula fica livre após fragmentar
    let alvos: Float32Array[] = [];

    let faseAtual = 0;
    let trocaEm = performance.now();
    const ponteiro = { x: -9999, y: -9999, ativo: false };
    let quadro = 0;

    function montar() {
      const r = caixa!.getBoundingClientRect();
      largura = r.width;
      altura = r.height;
      if (largura === 0 || altura === 0) return;
      const celular = largura < 640;
      dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2);
      canvas!.width = Math.round(largura * dpr);
      canvas!.height = Math.round(altura * dpr);

      // A legenda fica embaixo: as formas usam o espaço de cima.
      const baixo = altura < 520;
      escala = baixo ? Math.min(largura * 0.62, altura * 0.44, 560) : Math.min(largura * 0.78, altura * 0.68, 560);
      centro = { x: largura / 2, y: altura * (baixo ? 0.4 : 0.44) };

      const novoN = celular ? 560 : 1150;
      const aleatorio = rng(7);
      const recriar = px.length !== novoN;
      n = novoN;
      nDestaque = Math.round(n * 0.16);
      if (recriar) {
        px = new Float32Array(n);
        py = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        tamanho = new Float32Array(n);
        giro = new Float32Array(n);
        semente = new Float32Array(n);
        solta = new Float64Array(n);
      }

      funil = geometriaFunil(centro.x, centro.y, escala);
      const conjuntos = [
        formasTelefone(centro.x, centro.y, escala),
        formasEnvelope(centro.x, centro.y, escala),
        formasFunil(funil, escala),
      ];
      alvos = conjuntos.map((c) => {
        const a: Alvos = {
          normais: distribuir(c.normais, n - nDestaque, aleatorio),
          destaque: distribuir(c.destaque, nDestaque, aleatorio),
        };
        const arr = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) {
          const p = i < nDestaque ? a.destaque[i] : a.normais[i - nDestaque];
          arr[i * 2] = p.x;
          arr[i * 2 + 1] = p.y;
        }
        return arr;
      });

      for (let i = 0; i < n; i++) {
        tamanho[i] = (celular ? 1.4 : 1.6) + aleatorio() * (celular ? 1.5 : 2);
        giro[i] = (aleatorio() - 0.5) * 1.6;
        semente[i] = aleatorio();
        if (recriar) {
          // Começa espalhado e se monta no telefone
          px[i] = aleatorio() * largura;
          py[i] = aleatorio() * altura;
          solta[i] = performance.now() + 150 + semente[i] * 600;
        }
      }
    }

    /** Fragmenta a forma atual e manda as partículas para a próxima. */
    function irPara(proxima: number, origem?: Ponto) {
      const agora = performance.now();
      faseAtual = ((proxima % alvos.length) + alvos.length) % alvos.length;
      trocaEm = agora;
      setFase(faseAtual);
      if (reduzido) {
        for (let i = 0; i < n; i++) {
          px[i] = alvos[faseAtual][i * 2];
          py[i] = alvos[faseAtual][i * 2 + 1];
        }
        return;
      }
      const o = origem ?? centro;
      for (let i = 0; i < n; i++) {
        let dx = px[i] - o.x;
        let dy = py[i] - o.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= d;
        dy /= d;
        const perto = origem ? Math.max(0, 1 - d / (escala * 0.9)) : 0.5;
        const f = 2.5 + semente[i] * 6 + perto * 9;
        vx[i] += dx * f + (Math.random() - 0.5) * 2;
        vy[i] += dy * f + (Math.random() - 0.5) * 2;
        solta[i] = agora + 260 + semente[i] * 720;
      }
    }
    irParaRef.current = irPara;

    function desenhar(agora: number) {
      const t = agora / 1000;
      if (!reduzido && agora - trocaEm > DURACAO_FASE) irPara(faseAtual + 1);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, largura, altura);

      const alvo = alvos[faseAtual];
      if (!alvo) return;
      // Telefone tocando: tremidinha em rajadas
      const toque = faseAtual === 0 && !reduzido && t % 1.5 < 0.42 ? Math.sin(t * 52) * 2.4 : 0;
      const raio = largura < 640 ? 70 : 110;
      const forca = largura < 640 ? 2 : 2.8;

      const tinta = new Path2D();
      const cobalto = new Path2D();

      for (let i = 0; i < n; i++) {
        const i2 = i * 2;
        let bx = alvo[i2];
        let by = alvo[i2 + 1];

        // Funil: parte das partículas cobalto desce pelo funil sem parar
        if (faseAtual === 2 && funil && i < nDestaque && i % 3 !== 0 && !reduzido) {
          const u = (semente[i] + t * 0.16) % 1;
          const yy = funil.topo + (funil.base - funil.topo) * u;
          const k = limitar((yy - funil.topo) / (funil.gargalo - funil.topo));
          const meia = funil.larguraTopo / 2 + (funil.larguraGargalo / 2 - funil.larguraTopo / 2) * k;
          bx = funil.cx + (semente[(i * 7) % n] - 0.5) * 2 * meia * 0.7;
          by = yy;
        }

        if (!reduzido) {
          bx += Math.sin(t * 0.7 + semente[i] * 9) * 1.3 + toque;
          by += Math.cos(t * 0.6 + semente[i] * 11) * 1.3;
        }

        if (agora < solta[i]) {
          vx[i] *= 0.92;
          vy[i] *= 0.92;
        } else {
          vx[i] = vx[i] * 0.8 + (bx - px[i]) * 0.065;
          vy[i] = vy[i] * 0.8 + (by - py[i]) * 0.065;
        }

        if (ponteiro.ativo && !reduzido) {
          const dx = px[i] - ponteiro.x;
          const dy = py[i] - ponteiro.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < raio * raio && d2 > 0.01) {
            const dist = Math.sqrt(d2);
            const f = (1 - dist / raio) * forca;
            vx[i] += (dx / dist) * f;
            vy[i] += (dy / dist) * f;
          }
        }

        px[i] += vx[i];
        py[i] += vy[i];

        const s = tamanho[i];
        const ang = semente[i] * 6.28 + t * giro[i];
        const c = Math.cos(ang) * s;
        const sn = Math.sin(ang) * s;
        const caminho = i < nDestaque ? cobalto : tinta;
        caminho.moveTo(px[i] + c, py[i] + sn);
        caminho.lineTo(px[i] + (-0.5 * c - 0.866 * sn), py[i] + (0.866 * c - 0.5 * sn));
        caminho.lineTo(px[i] + (-0.5 * c + 0.866 * sn), py[i] + (-0.866 * c - 0.5 * sn));
        caminho.closePath();
      }

      ctx!.fillStyle = `rgba(${TINTA}, 0.78)`;
      ctx!.fill(tinta);
      ctx!.fillStyle = `rgba(${COBALTO}, 0.95)`;
      ctx!.fill(cobalto);
    }

    function laco(agora: number) {
      if (!document.hidden) desenhar(agora);
      quadro = requestAnimationFrame(laco);
    }

    const posicao = (e: PointerEvent): Ponto => {
      const r = caixa!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const aoMover = (e: PointerEvent) => {
      const p = posicao(e);
      ponteiro.x = p.x;
      ponteiro.y = p.y;
      ponteiro.ativo = true;
    };
    const aoSair = () => {
      ponteiro.ativo = false;
    };
    const aoClicar = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      irPara(faseAtual + 1, posicao(e));
    };

    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const aoRedimensionar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(montar, 150);
    };

    montar();
    if (reduzido) {
      for (let i = 0; i < n; i++) {
        px[i] = alvos[0][i * 2];
        py[i] = alvos[0][i * 2 + 1];
        solta[i] = 0;
      }
    }
    quadro = requestAnimationFrame(laco);

    caixa.addEventListener("pointermove", aoMover, { passive: true });
    caixa.addEventListener("pointerleave", aoSair);
    caixa.addEventListener("pointerdown", aoClicar);
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(temporizador);
      caixa.removeEventListener("pointermove", aoMover);
      caixa.removeEventListener("pointerleave", aoSair);
      caixa.removeEventListener("pointerdown", aoClicar);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  const atual = fases[fase] ?? fases[0];

  return (
    <div ref={caixaRef} className="relative h-full w-full cursor-crosshair select-none touch-pan-y">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-5 md:px-12 md:pb-12">
        <div className="pointer-events-auto flex items-center gap-2" role="group" aria-label={rotulo}>
          {fases.map((f, i) => (
            <button
              key={f.titulo}
              type="button"
              onClick={() => irParaRef.current(i)}
              aria-pressed={i === fase}
              className={`min-h-[36px] rounded-full px-3 text-xs font-medium tabular-nums tracking-wider transition-colors ${
                i === fase ? "bg-[#111114] text-[#f4f3ef]" : "text-[#4b4b53] hover:text-[#111114]"
              }`}
            >
              0{i + 1}
              <span className="sr-only"> {f.titulo}</span>
            </button>
          ))}
        </div>
        <p aria-live="polite" className="mt-3 max-w-[36ch] md:mt-5">
          <span key={`t${fase}`} className="studio-surgir block text-xl font-medium tracking-tight md:text-2xl">
            {atual.titulo}
          </span>
          <span key={`d${fase}`} className="studio-surgir mt-1 hidden md:block text-[15px] leading-relaxed text-[#4b4b53]">
            {atual.texto}
          </span>
        </p>
      </div>
    </div>
  );
}
