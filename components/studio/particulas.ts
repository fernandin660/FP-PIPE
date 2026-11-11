/* Utilitários das animações de partículas (site do estúdio e tela de entrada). */

export type Ponto = { x: number; y: number };

export const TINTA = "17, 17, 20";
export const COBALTO = "36, 66, 229";


export function rng(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function suavizar(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function limitar(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

export function janela(p: number, inicio: number, fim: number) {
  return limitar((p - inicio) / (fim - inicio));
}

// ---------- amostradores de forma ----------
export type Forma =
  | { tipo: "contorno"; x: number; y: number; w: number; h: number; peso: number }
  | { tipo: "cheio"; x: number; y: number; w: number; h: number; peso: number }
  | { tipo: "circulo"; cx: number; cy: number; r: number; peso: number }
  | { tipo: "linha"; x1: number; y1: number; x2: number; y2: number; peso: number }
  | { tipo: "disco"; cx: number; cy: number; r: number; peso: number }
  | { tipo: "arco"; cx: number; cy: number; rx: number; ry: number; a0: number; a1: number; peso: number };

export function amostrar(f: Forma, aleatorio: () => number): Ponto {
  switch (f.tipo) {
    case "cheio":
      return { x: f.x + aleatorio() * f.w, y: f.y + aleatorio() * f.h };
    case "circulo": {
      const a = aleatorio() * Math.PI * 2;
      return { x: f.cx + Math.cos(a) * f.r, y: f.cy + Math.sin(a) * f.r };
    }
    case "disco": {
      const a = aleatorio() * Math.PI * 2;
      const r = f.r * Math.sqrt(aleatorio());
      return { x: f.cx + Math.cos(a) * r, y: f.cy + Math.sin(a) * r };
    }
    case "arco": {
      const a = f.a0 + (f.a1 - f.a0) * aleatorio();
      return { x: f.cx + Math.cos(a) * f.rx, y: f.cy + Math.sin(a) * f.ry };
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

export function distribuir(formas: Forma[], n: number, aleatorio: () => number): Ponto[] {
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
