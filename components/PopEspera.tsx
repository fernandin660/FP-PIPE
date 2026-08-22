"use client";

export default function PopEspera({
  aberto,
  titulo,
  mensagem,
  rodape = "Leva menos de 1 minuto — não feche esta janela.",
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rodape?: string;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="bg-pipe-card border border-pipe-border rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="mx-auto w-12 h-12 border-4 border-pipe-border border-t-pipe-lime rounded-full animate-spin" />
        <h3 className="font-display text-2xl text-white mt-5">{titulo}</h3>
        <p className="text-pipe-muted text-sm mt-2">{mensagem}</p>
        {rodape && (
          <p className="text-pipe-muted/60 text-xs mt-4">{rodape}</p>
        )}
      </div>
    </div>
  );
}
