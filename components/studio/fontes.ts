import { Cormorant_Garamond, Inter_Tight } from "next/font/google";

export const interTight = Inter_Tight({
  variable: "--font-studio",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// Serifada usada só nas maquetes dos projetos (marcas fictícias/protótipo).
export const cormorant = Cormorant_Garamond({
  variable: "--font-concept-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});
