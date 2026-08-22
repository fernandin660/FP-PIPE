export const conhecimentoCnae: Record<string, string[]> = {
  "Agronegócio e Agricultura": [
    "0151201",
    "0151202",
    "0111302",
    "0112101",
  ],
  "Alimentos e Bebidas": [
    "5611201",
    "4712100",
    "1011201",
    "1041400",
    "1112700",
  ],
  Automotivo: [
    "4511101",
    "4520001",
    "4530703",
  ],
  "Construção Civil": [
    "4120400",
    "4399103",
    "4211101",
    "4321500",
  ],
  Consultoria: [
    "7020400",
    "6920601",
    "6204000",
  ],
  "E-commerce": [
    "4772500",
    "4713002",
    "4781400",
    "6311900",
  ],
  Educação: [
    "8532500",
    "8513900",
    "8599604",
  ],
  "Energia e Utilities": [
    "3511501",
    "4321500",
    "3510301",
  ],
  Farmacêutica: [
    "2121100",
    "4771701",
    "8640202",
  ],
  "Governo e Setor Público": [
    "8411600",
    "8422100",
  ],
  "Hotelaria e Turismo": [
    "5510801",
    "7911200",
  ],
  Imobiliário: [
    "6810300",
    "6821800",
    "6810201",
  ],
  "Indústria Química": [
    "2063100",
    "2029300",
    "2013400",
  ],
  Jurídico: [
    "6911701",
  ],
  "Logística e Transporte": [
    "4930202",
    "4930203",
    "5211701",
    "5320702",
  ],
  Manufatura: [
    "2512800",
    "2229300",
    "2542000",
  ],
  "Mídia e Marketing": [
    "7311400",
    "7319002",
    "7410202",
  ],
  Mineração: [
    "0710300",
    "0810000",
  ],
  "ONGs e Terceiro Setor": [
    "9430800",
    "8800600",
  ],
  "Papel e Celulose": [
    "1710100",
    "1721400",
  ],
  "Petróleo e Gás": [
    "0610001",
    "0910600",
    "4731800",
  ],
  "Saúde e Hospitais": [
    "8610100",
    "8630502",
    "8630504",
    "8640202",
  ],
  Seguros: [
    "6512100",
    "6621500",
  ],
  "Serviços Financeiros": [
    "6422100",
    "7490103",
    "6611802",
  ],
  "Tecnologia e Software": [
    "6201501",
    "6204000",
    "6209100",
    "6311900",
  ],
  Telecomunicações: [
    "6120501",
    "6131700",
    "6141800",
  ],
  "Têxtil e Moda": [
    "1311100",
    "1412601",
    "1531901",
  ],
  Varejo: [
    "4712100",
    "4751201",
    "4772500",
  ],
};

export function normalizarTextoLocal(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function formatarCnpj(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, "");
  if (digitos.length !== 14) return cnpj;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}
