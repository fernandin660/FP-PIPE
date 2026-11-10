"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Dicionario } from "./dicionario";

/*
 * Hero em 3 atos guiado pelo scroll:
 *   1. Ruído   — partículas soltas que fogem do cursor/dedo.
 *   2. Site    — as partículas montam um site (janela de navegador ou celular).
 *   3. Rede    — o site vira uma rede de clientes ligados à empresa.
 *
 * Canvas 2D (leve no celular), triângulos desenhados em lote (2 fills por
 * quadro), molas para o movimento orgânico e pausa fora da tela.
 */

type Ponto = { x: number; y: number };
type Alvos = { normais: Ponto[]; destaque: Ponto[] };
type Rede = { centro: Ponto; nos: Ponto[]; arestas: [number, number][] };

const TINTA = "17, 17, 20";
const COBALTO = "36, 66, 229";

function rng(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function suavizar(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function limitar(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function janela(p: number, inicio: number, fim: number) {
  return limitar((p - inicio) / (fim - inicio));
}

// ---------- amostradores de forma ----------
type Forma =
  | { tipo: "contorno"; x: number; y: number; w: number; h: number; peso: number }
  | { tipo: "cheio"; x: number; y: number; w: number; h: number; peso: number }
  | { tipo: "circulo"; cx: number; cy: number; r: number; peso: number }
  | { tipo: "linha"; x1: number; y1: number; x2: number; y2: number; peso: number };

function amostrar(f: Forma, aleatorio: () => number): Ponto {
  switch (f.tipo) {
    case "cheio":
      return { x: f.x + aleatorio() * f.w, y: f.y + aleatorio() * f.h };
    case "circulo": {
      const a = aleatorio() * Math.PI * 2;
      return { x: f.cx + Math.cos(a) * f.r, y: f.cy + Math.sin(a) * f.r };
    }
    case "linha": {
      const t = aleatorio();
      return { x: f.x1 + (f.x2 - f.x1) * t, y: f.y1 + (f.y2 - f.y1) * t };
    }
    case "contorno": {
      const per = 2 * (f.w + f.h);
      let d = aleatorio() * per;
      if (d < f.w) return { x: f.x + d, y: f.y };
      d -= f.w;
      if (d < f.h) return { x: f.x + f.w, y: f.y + d };
      d -= f.h;
      if (d < f.w) return { x: f.x + f.w - d, y: f.y + f.h };
      d -= f.w;
      return { x: f.x, y: f.y + f.h - d };
    }
  }
}

function distribuir(formas: Forma[], n: number, aleatorio: () => number): Ponto[] {
  const total = formas.reduce((s, f) => s + f.peso, 0);
  const pontos: Ponto[] = [];
  formas.forEach((f, i) => {
    const qtd =
      i === formas.length - 1
        ? n - pontos.length
        : Math.round((f.peso / total) * n);
    for (let k = 0; k < qtd && pontos.length < n; k++) pontos.push(amostrar(f, aleatorio));
  });
  while (pontos.length < n) pontos.push(amostrar(formas[0], aleatorio));
  return pontos;
}

// ---------- ato 2: o site ----------
function formasSite(cx: number, cy: number, w: number, h: number, celular: boolean) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const normais: Forma[] = [];
  const destaque: Forma[] = [];
  const barra = celular ? 0.06 : 0.09;

  normais.push({ tipo: "contorno", x, y, w, h, peso: 22 });
  normais.push({ tipo: "linha", x1: x, y1: y + h * barra, x2: x + w, y2: y + h * barra, peso: 5 });

  if (celular) {
    // Celular: notch, menu, título, texto, botão, imagem embaixo
    normais.push({ tipo: "cheio", x: cx - w * 0.12, y: y + h * 0.022, w: w * 0.24, h: h * 0.014, peso: 2 });
    normais.push({ tipo: "cheio", x: x + w * 0.08, y: y + h * 0.1, w: w * 0.84, h: h * 0.045, peso: 9 });
    normais.push({ tipo: "cheio", x: x + w * 0.08, y: y + h * 0.165, w: w * 0.6, h: h * 0.045, peso: 7 });
    normais.push({ tipo: "linha", x1: x + w * 0.08, y1: y + h * 0.25, x2: x + w * 0.88, y2: y + h * 0.25, peso: 2 });
    normais.push({ tipo: "linha", x1: x + w * 0.08, y1: y + h * 0.28, x2: x + w * 0.74, y2: y + h * 0.28, peso: 2 });
    normais.push({ tipo: "contorno", x: x + w * 0.08, y: y + h * 0.43, w: w * 0.84, h: h * 0.42, peso: 10 });
    normais.push({ tipo: "linha", x1: x + w * 0.08, y1: y + h * 0.8, x2: x + w * 0.42, y2: y + h * 0.6, peso: 5 });
    normais.push({ tipo: "linha", x1: x + w * 0.42, y1: y + h * 0.6, x2: x + w * 0.62, y2: y + h * 0.72, peso: 3 });
    normais.push({ tipo: "linha", x1: x + w * 0.62, y1: y + h * 0.72, x2: x + w * 0.92, y2: y + h * 0.55, peso: 4 });
    destaque.push({ tipo: "cheio", x: x + w * 0.08, y: y + h * 0.32, w: w * 0.44, h: h * 0.06, peso: 6 });
    destaque.push({ tipo: "circulo", cx: x + w * 0.76, cy: y + h * 0.53, r: w * 0.06, peso: 3 });
  } else {
    // Desktop: três bolinhas, barra de endereço, menu, título, texto, botão, imagem
    [0.025, 0.045, 0.065].forEach((px) =>
      normais.push({ tipo: "circulo", cx: x + w * px, cy: y + h * 0.045, r: w * 0.007, peso: 1 })
    );
    normais.push({ tipo: "contorno", x: x + w * 0.12, y: y + h * 0.025, w: w * 0.5, h: h * 0.04, peso: 4 });
    [0.62, 0.72, 0.82].forEach((px) =>
      normais.push({ tipo: "linha", x1: x + w * px, y1: y + h * 0.16, x2: x + w * (px + 0.06), y2: y + h * 0.16, peso: 1.5 })
    );
    normais.push({ tipo: "cheio", x: x + w * 0.06, y: y + h * 0.3, w: w * 0.44, h: h * 0.065, peso: 13 });
    normais.push({ tipo: "cheio", x: x + w * 0.06, y: y + h * 0.39, w: w * 0.32, h: h * 0.065, peso: 10 });
    [0.53, 0.57, 0.61].forEach((py, i) =>
      normais.push({ tipo: "linha", x1: x + w * 0.06, y1: y + h * py, x2: x + w * (0.44 - i * 0.06), y2: y + h * py, peso: 2 })
    );
    normais.push({ tipo: "contorno", x: x + w * 0.58, y: y + h * 0.24, w: w * 0.36, h: h * 0.56, peso: 9 });
    normais.push({ tipo: "linha", x1: x + w * 0.58, y1: y + h * 0.72, x2: x + w * 0.7, y2: y + h * 0.52, peso: 3 });
    normais.push({ tipo: "linha", x1: x + w * 0.7, y1: y + h * 0.52, x2: x + w * 0.8, y2: y + h * 0.64, peso: 2 });
    normais.push({ tipo: "linha", x1: x + w * 0.8, y1: y + h * 0.64, x2: x + w * 0.94, y2: y + h * 0.46, peso: 3 });
    destaque.push({ tipo: "cheio", x: x + w * 0.06, y: y + h * 0.17 - h * 0.015, w: w * 0.1, h: h * 0.03, peso: 2 });
    destaque.push({ tipo: "cheio", x: x + w * 0.06, y: y + h * 0.68, w: w * 0.16, h: h * 0.07, peso: 7 });
    destaque.push({ tipo: "circulo", cx: x + w * 0.86, cy: y + h * 0.34, r: w * 0.03, peso: 3 });
  }
  return { normais, destaque };
}

// ---------- ato 3: a rede ----------
function montarRede(cx: number, cy: number, raio: number, qtdNos: number, aleatorio: () => number): Rede {
  const nos: Ponto[] = [];
  for (let i = 0; i < qtdNos; i++) {
    const a = (i / qtdNos) * Math.PI * 2 + aleatorio() * 0.5;
    const r = raio * (0.42 + aleatorio() * 0.58);
    nos.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.86 });
  }
  const arestas: [number, number][] = [];
  nos.forEach((n, i) => {
    arestas.push([i, -1]); // -1 = centro
    let melhor = -1;
    let dist = Infinity;
    nos.forEach((m, j) => {
      if (i === j) return;
      const d = (n.x - m.x) ** 2 + (n.y - m.y) ** 2;
      if (d < dist) {
        dist = d;
        melhor = j;
      }
    });
    if (melhor > i) arestas.push([i, melhor]);
  });
  return { centro: { x: cx, y: cy }, nos, arestas };
}

function alvosRede(rede: Rede, nNormais: number, nDestaque: number, aleatorio: () => number): Alvos {
  const gauss = (s: number) => (aleatorio() + aleatorio() + aleatorio() - 1.5) * s;
  const ponto = (i: number) => (i === -1 ? rede.centro : rede.nos[i]);
  const normais: Ponto[] = [];
  for (let k = 0; k < nNormais; k++) {
    if (k % 20 < 9) {
      const n = rede.nos[k % rede.nos.length];
      normais.push({ x: n.x + gauss(14), y: n.y + gauss(14) });
    } else {
      const [a, b] = rede.arestas[k % rede.arestas.length];
      const p1 = ponto(a);
      const p2 = ponto(b);
      const t = aleatorio();
      normais.push({ x: p1.x + (p2.x - p1.x) * t + gauss(2), y: p1.y + (p2.y - p1.y) * t + gauss(2) });
    }
  }
  const destaque: Ponto[] = [];
  for (let k = 0; k < nDestaque; k++) {
    if (k % 10 < 7) {
      destaque.push({ x: rede.centro.x + gauss(34), y: rede.centro.y + gauss(34) });
    } else {
      const n = rede.nos[(k * 7) % Math.min(5, rede.nos.length)];
      destaque.push({ x: n.x + gauss(10), y: n.y + gauss(10) });
    }
  }
  return { normais, destaque };
}

export default function HeroParticulas({ dic }: { dic: Dicionario }) {
  const secaoRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atosRef = useRef<(HTMLDivElement | null)[]>([]);
  const dicaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const secao = secaoRef.current;
    const canvas = canvasRef.current;
    if (!secao || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let largura = 0;
    let altura = 0;
    let dpr = 1;
    let celular = false;

    // Estado das partículas (arrays tipados = rápido no celular)
    let n = 0;
    let nDestaque = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let tamanho = new Float32Array(0);
    let giro = new Float32Array(0);
    let fase = new Float32Array(0);
    let atraso = new Float32Array(0);
    let a1 = new Float32Array(0); // ato 1 (x,y intercalados)
    let a2 = new Float32Array(0);
    let a3 = new Float32Array(0);
    let rede: Rede | null = null;

    const ponteiro = { x: -9999, y: -9999, ativo: false };
    let progresso = 0;
    let visivel = true;
    let quadro = 0;

    function montar() {
      const r = canvas!.getBoundingClientRect();
      largura = r.width;
      altura = r.height;
      celular = largura < 820;
      dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2);
      canvas!.width = Math.round(largura * dpr);
      canvas!.height = Math.round(altura * dpr);

      // Espaço livre acima do texto (no celular o texto fica embaixo):
      // as formas se encaixam nele em qualquer altura de tela.
      const topoCanvas = r.top;
      const livreTopo = 64 + 12;
      const espaco = [0, 1, 2].map((i) => {
        const el = atosRef.current[i];
        const topo = el ? el.getBoundingClientRect().top - topoCanvas : altura;
        const alt = Math.max(140, topo - livreTopo - 20);
        return { altura: alt, centro: livreTopo + alt / 2 };
      });

      const novoN = celular ? 760 : 1500;
      const aleatorio = rng(42);
      n = novoN;
      nDestaque = Math.round(n * 0.14);

      const recriar = px.length !== n;
      if (recriar) {
        px = new Float32Array(n);
        py = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        tamanho = new Float32Array(n);
        giro = new Float32Array(n);
        fase = new Float32Array(n);
        atraso = new Float32Array(n);
      }
      a1 = new Float32Array(n * 2);
      a2 = new Float32Array(n * 2);
      a3 = new Float32Array(n * 2);

      // Ato 1: ruído espalhado pela tela toda
      for (let i = 0; i < n; i++) {
        a1[i * 2] = aleatorio() * largura;
        // No celular o texto fica embaixo: o ruído ocupa a parte de cima,
        // com poucas partículas "vazando" para não brigar com a leitura.
        a1[i * 2 + 1] = celular
          ? (aleatorio() < 0.92
              ? aleatorio() * (livreTopo + espaco[0].altura)
              : livreTopo + espaco[0].altura + aleatorio() * (altura - livreTopo - espaco[0].altura))
          : aleatorio() * altura;
        tamanho[i] = (celular ? 1.5 : 1.7) + aleatorio() * (celular ? 1.6 : 2.2);
        giro[i] = (aleatorio() - 0.5) * 1.6;
        fase[i] = aleatorio() * Math.PI * 2;
        atraso[i] = aleatorio() * 0.4;
        if (recriar) {
          px[i] = a1[i * 2];
          py[i] = a1[i * 2 + 1];
        }
      }

      // Ato 2: o site
      const site = celular
        ? (() => {
            const h = Math.min(Math.min(largura * 0.72, 340) * 1.45, espaco[1].altura * 0.94);
            const w = Math.min(largura * 0.72, 340, h / 1.2);
            return formasSite(largura / 2, espaco[1].centro, w, h, true);
          })()
        : (() => {
            const w = Math.min(largura * 0.48, 780);
            const h = Math.min(w * 0.66, altura * 0.72);
            return formasSite(largura * 0.7, altura * 0.52, w, h, false);
          })();
      const pn = distribuir(site.normais, n - nDestaque, aleatorio);
      const pd = distribuir(site.destaque, nDestaque, aleatorio);

      // Ato 3: a rede
      rede = celular
        ? montarRede(largura / 2, espaco[2].centro, Math.min(largura * 0.4, espaco[2].altura * 0.46), 16, aleatorio)
        : montarRede(largura * 0.7, altura * 0.52, Math.min(largura * 0.24, altura * 0.38), 26, aleatorio);
      const r3 = alvosRede(rede, n - nDestaque, nDestaque, aleatorio);

      for (let i = 0; i < n; i++) {
        const destaque = i < nDestaque;
        const p2 = destaque ? pd[i] : pn[i - nDestaque];
        const p3 = destaque ? r3.destaque[i] : r3.normais[i - nDestaque];
        a2[i * 2] = p2.x;
        a2[i * 2 + 1] = p2.y;
        a3[i * 2] = p3.x;
        a3[i * 2 + 1] = p3.y;
      }
    }

    function lerProgresso() {
      const r = secao!.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      progresso = total > 0 ? limitar(-r.top / total) : 0;
    }

    function atualizarTextos() {
      const p = progresso;
      const vis = [
        1 - janela(p, 0.14, 0.24),
        janela(p, 0.36, 0.44) * (1 - janela(p, 0.58, 0.65)),
        janela(p, 0.76, 0.84),
      ];
      atosRef.current.forEach((el, i) => {
        if (!el) return;
        const v = vis[i];
        el.style.opacity = String(v);
        el.style.transform = `translate3d(0, ${(1 - v) * 28}px, 0)`;
        el.style.visibility = v < 0.02 ? "hidden" : "visible";
        el.style.pointerEvents = v > 0.6 ? "auto" : "none";
      });
      if (dicaRef.current) dicaRef.current.style.opacity = String(1 - janela(p, 0.02, 0.1));
    }

    function desenhar(tempo: number) {
      const t = tempo / 1000;
      const m1 = janela(progresso, 0.2, 0.42);
      const m2 = janela(progresso, 0.62, 0.82);
      const k = reduzido ? 1 : 0.075;
      const amort = reduzido ? 0 : 0.8;
      const raio = celular ? 90 : 130;
      const forca = celular ? 2.2 : 3.2;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, largura, altura);

      // Linhas da rede (aparecem no ato 3)
      if (rede && m2 > 0.05) {
        const alfa = suavizar(m2) * 0.22;
        ctx!.strokeStyle = `rgba(${TINTA}, ${alfa})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        for (const [a, b] of rede.arestas) {
          const p1 = a === -1 ? rede.centro : rede.nos[a];
          const p2 = b === -1 ? rede.centro : rede.nos[b];
          ctx!.moveTo(p1.x, p1.y);
          ctx!.lineTo(p2.x, p2.y);
        }
        ctx!.stroke();

        // Pulsos: clientes chegando até a empresa
        if (m2 > 0.6 && !reduzido) {
          ctx!.fillStyle = `rgba(${COBALTO}, ${suavizar(janela(m2, 0.6, 1))})`;
          rede.nos.forEach((no, i) => {
            const s = (t * 0.35 + i * 0.137) % 1;
            const x = no.x + (rede!.centro.x - no.x) * s;
            const y = no.y + (rede!.centro.y - no.y) * s;
            ctx!.beginPath();
            ctx!.arc(x, y, 2.4, 0, Math.PI * 2);
            ctx!.fill();
          });
        }
      }

      const caminhoTinta = new Path2D();
      const caminhoCobalto = new Path2D();

      for (let i = 0; i < n; i++) {
        const d = atraso[i];
        const t1 = suavizar(limitar(m1 * 1.4 - d));
        const t2 = suavizar(limitar(m2 * 1.4 - d));
        const i2 = i * 2;
        let bx = a1[i2] + (a2[i2] - a1[i2]) * t1;
        let by = a1[i2 + 1] + (a2[i2 + 1] - a1[i2 + 1]) * t1;
        bx += (a3[i2] - bx) * t2;
        by += (a3[i2 + 1] - by) * t2;

        if (!reduzido) {
          const amp = (16 + (1.2 - 16) * t1) * (1 - t2) + 3 * t2;
          bx += Math.sin(t * 0.6 + fase[i]) * amp;
          by += Math.cos(t * 0.5 + fase[i] * 1.3) * amp;
        }

        vx[i] = vx[i] * amort + (bx - px[i]) * k;
        vy[i] = vy[i] * amort + (by - py[i]) * k;

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

        // Triângulo girando
        const s = tamanho[i];
        const ang = fase[i] + t * giro[i];
        const c = Math.cos(ang) * s;
        const sn = Math.sin(ang) * s;
        const caminho = i < nDestaque ? caminhoCobalto : caminhoTinta;
        caminho.moveTo(px[i] + c, py[i] + sn);
        caminho.lineTo(px[i] + (-0.5 * c - 0.866 * sn), py[i] + (0.866 * c - 0.5 * sn));
        caminho.lineTo(px[i] + (-0.5 * c + 0.866 * sn), py[i] + (-0.866 * c - 0.5 * sn));
        caminho.closePath();
      }

      ctx!.fillStyle = `rgba(${TINTA}, 0.78)`;
      ctx!.fill(caminhoTinta);
      ctx!.fillStyle = `rgba(${COBALTO}, 0.95)`;
      ctx!.fill(caminhoCobalto);
    }

    function laco(tempo: number) {
      if (visivel) {
        lerProgresso();
        atualizarTextos();
        desenhar(tempo);
      }
      quadro = requestAnimationFrame(laco);
    }

    const aoMover = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      ponteiro.x = e.clientX - r.left;
      ponteiro.y = e.clientY - r.top;
      ponteiro.ativo = true;
    };
    const aoSair = () => {
      ponteiro.ativo = false;
    };

    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const aoRedimensionar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(montar, 150);
    };

    const observador = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
    });
    observador.observe(secao);

    montar();
    lerProgresso();
    atualizarTextos();
    quadro = requestAnimationFrame(laco);

    window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("pointerdown", aoMover, { passive: true });
    window.addEventListener("pointerup", aoSair, { passive: true });
    document.addEventListener("pointerleave", aoSair);
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      clearTimeout(temporizador);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerdown", aoMover);
      window.removeEventListener("pointerup", aoSair);
      document.removeEventListener("pointerleave", aoSair);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  const [ato1, ato2, ato3] = dic.hero.atos;

  return (
    <section ref={secaoRef} className="relative h-[360svh] md:h-[420svh]" aria-label={dic.hero.selo}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1320px] flex-col justify-end px-6 pb-16 md:justify-center md:px-10 md:pb-0">
          <div className="relative min-h-[46svh] md:min-h-0 md:h-[60svh] md:w-[44%]">
            <div ref={(el) => { atosRef.current[0] = el; }} className="absolute inset-x-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 will-change-transform">
              <p className="studio-selo mb-5">{dic.hero.selo}</p>
              <h1 className="studio-titulo-hero">{ato1.titulo}</h1>
              <p className="mt-6 max-w-[34ch] text-lg text-[#4b4b53] md:text-xl">{ato1.texto}</p>
            </div>

            <div ref={(el) => { atosRef.current[1] = el; }} className="invisible absolute inset-x-0 bottom-0 opacity-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 will-change-transform">
              <h2 className="studio-titulo-hero">{ato2.titulo}</h2>
              <p className="mt-6 max-w-[34ch] text-lg text-[#4b4b53] md:text-xl">{ato2.texto}</p>
            </div>

            <div ref={(el) => { atosRef.current[2] = el; }} className="invisible absolute inset-x-0 bottom-0 opacity-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 will-change-transform">
              <h2 className="studio-titulo-hero">{ato3.titulo}</h2>
              <p className="mt-6 max-w-[38ch] text-lg text-[#4b4b53] md:text-xl">{ato3.texto}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#contact" className="studio-botao" data-cursor="grande">
                  {dic.hero.ctaPrincipal}
                </a>
                <Link href="/" className="studio-botao-fantasma" data-cursor="grande">
                  {dic.hero.ctaFpPipe} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div ref={dicaRef} className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#5e5e66] md:flex">
          {dic.hero.rolar}
          <span className="studio-linha-rolar" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
