"use client";

import { useEffect, useState } from "react";

const mensagens = [
  "👋 Fale com um consultor",
  "💬 Tire suas dúvidas na hora",
  "⭐ Plano Fundador · vagas limitadas",
];

const WHATSAPP = "https://wa.me/5516997700593?text=" +
  encodeURIComponent(
    "Olá! Vim pelo site do FP Pipe e quero saber mais."
  );

export default function AvatarConsultor() {
  const [indice, setIndice] = useState(0);
  const [bolhaAberta, setBolhaAberta] = useState(true);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    // Restaura o "fechado" desta sessão após a hidratação.
    Promise.resolve().then(() => {
      try {
        if (
          sessionStorage.getItem("fp-avatar-fechado") === "1"
        ) {
          setFechado(true);
        }
      } catch {}
    });

    const intervalo = setInterval(() => {
      setIndice((atual) => (atual + 1) % mensagens.length);
    }, 4000);

    return () => clearInterval(intervalo);
  }, []);

  if (fechado) return null;

  function fechar() {
    setFechado(true);

    try {
      sessionStorage.setItem("fp-avatar-fechado", "1");
    } catch {}
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-end gap-3">
      {bolhaAberta && (
        <div className="relative mb-3 max-w-[230px] bg-white text-gray-900 rounded-2xl rounded-br-sm px-4 py-3 shadow-2xl">
          <button
            onClick={fechar}
            title="Fechar"
            aria-label="Fechar mensagem"
            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-pipe-card text-white text-xs leading-none border border-white/30 hover:bg-red-500 transition"
          >
            ✕
          </button>

          <p
            key={indice}
            className="text-sm font-semibold animate-[fadein_.4s_ease]"
          >
            {mensagens[indice]}
          </p>

          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-xs font-bold text-center text-black bg-pipe-lime hover:brightness-110 transition rounded-md py-1.5"
          >
            Chamar no WhatsApp →
          </a>
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          title="Fale com um consultor no WhatsApp"
          className="relative block anim-float"
          style={{ ["--rot" as string]: "0deg" }}
        >
          <span className="absolute inset-0 rounded-full bg-pipe-lime/50 animate-ping" />

          <img
            src="/consultor-fernando.jpg"
            alt="Fernando — consultor FP Pipe"
            className="relative w-16 h-16 rounded-full object-cover border-2 border-pipe-lime shadow-xl hover:scale-110 transition-transform duration-200"
            style={{ objectPosition: "50% 15%" }}
          />

          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-pipe-bg" />
        </a>

        <button
          onClick={() => setBolhaAberta((aberta) => !aberta)}
          className="text-[10px] font-semibold text-white bg-pipe-card/90 border border-pipe-border rounded-full px-2 py-0.5 hover:border-pipe-blue transition"
        >
          {bolhaAberta ? "ocultar" : "fale comigo"}
        </button>
      </div>
    </div>
  );
}
