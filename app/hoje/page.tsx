import type { Metadata } from "next";
import TelaHoje from "../../components/hoje/TelaHoje";

export const metadata: Metadata = { title: "Hoje — FP Pipe" };

export default function PaginaHoje() {
  return <TelaHoje />;
}
