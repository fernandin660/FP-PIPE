"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Cursor próprio: ponto cobalto com atraso que cresce sobre links. Só com mouse. */
export function CursorStudio() {
  const pontoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fino = window.matchMedia("(pointer: fine)").matches;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ponto = pontoRef.current;
    if (!fino || reduzido || !ponto) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;
    let escala = 1;
    let alvoEscala = 1;
    let quadro = 0;

    const mover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      ponto.style.opacity = "1";
      const alvo = (e.target as HTMLElement | null)?.closest("a, button, [data-cursor]");
      alvoEscala = alvo ? 3.2 : 1;
    };
    const sair = () => {
      ponto.style.opacity = "0";
    };

    const laco = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      escala += (alvoEscala - escala) * 0.18;
      ponto.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${escala})`;
      quadro = requestAnimationFrame(laco);
    };
    quadro = requestAnimationFrame(laco);
    window.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerleave", sair);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerleave", sair);
    };
  }, []);

  return <div ref={pontoRef} className="studio-cursor" aria-hidden="true" />;
}

/** Revela o conteúdo com um leve deslize quando entra na tela. */
export function Revelar({
  children,
  atraso = 0,
  className = "",
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`studio-revelar ${visto ? "studio-revelado" : ""} ${className}`}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  );
}

/** Cartão que inclina em 3D seguindo o cursor (no celular fica parado). */
export function CartaoInclinavel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${nx * 8}deg) rotateX(${-ny * 8}deg) translateY(-4px)`;
    el.style.setProperty("--brilho-x", `${(nx + 0.5) * 100}%`);
    el.style.setProperty("--brilho-y", `${(ny + 0.5) * 100}%`);
  }
  function sair() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div ref={ref} onPointerMove={mover} onPointerLeave={sair} className={`studio-inclinavel ${className}`} data-cursor="grande">
      {children}
    </div>
  );
}

/** Barra superior que ganha fundo depois que a pessoa começa a rolar. */
export function BarraTopo({ children }: { children: ReactNode }) {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        rolou
          ? "border-b border-[#dedcd6] bg-[#f4f3ef]/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      {children}
    </header>
  );
}
