export type Cargo = {
  nome: string;
  departamento: string;
  nivel: number;
};

// Nível de autoridade (menor número = mais autoridade):
// 1 = Dono/Sócio/C-Level | 2 = Diretoria | 3 = Gerência
// 4 = Coordenação/Supervisão | 5 = Especialista/Liderança técnica
// 6 = Analista/Pleno
export const CATALOGO_CARGOS: Cargo[] = [
  // ================= GERAL / DIREÇÃO =================
  { nome: "Dono(a) / Sócio(a)", departamento: "Geral", nivel: 1 },
  { nome: "CEO / Presidente", departamento: "Geral", nivel: 1 },
  { nome: "COO / Diretor de Operações", departamento: "Geral", nivel: 2 },
  { nome: "Diretor Geral", departamento: "Geral", nivel: 2 },
  { nome: "Diretor Comercial", departamento: "Geral", nivel: 2 },
  { nome: "Diretor Administrativo", departamento: "Geral", nivel: 2 },
  { nome: "Gerente Geral", departamento: "Geral", nivel: 3 },
  { nome: "Gerente de Filial / Unidade", departamento: "Geral", nivel: 3 },

  // ================= TECNOLOGIA E TI =================
  { nome: "CIO / Diretor de TI", departamento: "Tecnologia e TI", nivel: 2 },
  { nome: "CTO / Diretor de Tecnologia", departamento: "Tecnologia e TI", nivel: 2 },
  { nome: "Diretor de Segurança da Informação (CISO)", departamento: "Tecnologia e TI", nivel: 2 },
  { nome: "Gerente de TI", departamento: "Tecnologia e TI", nivel: 3 },
  { nome: "Gerente de Sistemas", departamento: "Tecnologia e TI", nivel: 3 },
  { nome: "Gerente de Infraestrutura", departamento: "Tecnologia e TI", nivel: 3 },
  { nome: "Gerente de Segurança da Informação", departamento: "Tecnologia e TI", nivel: 3 },
  { nome: "Coordenador de TI", departamento: "Tecnologia e TI", nivel: 4 },
  { nome: "Supervisor de TI", departamento: "Tecnologia e TI", nivel: 4 },
  { nome: "Líder Técnico / Tech Lead", departamento: "Tecnologia e TI", nivel: 5 },
  { nome: "Arquiteto de Solutions / Soluções", departamento: "Tecnologia e TI", nivel: 5 },
  { nome: "Analista de TI", departamento: "Tecnologia e TI", nivel: 6 },
  { nome: "Analista de Suporte", departamento: "Tecnologia e TI", nivel: 6 },
  { nome: "Analista de Segurança da Informação", departamento: "Tecnologia e TI", nivel: 6 },
  { nome: "Analista de Sistemas", departamento: "Tecnologia e TI", nivel: 6 },
  { nome: "Desenvolvedor Sênior", departamento: "Tecnologia e TI", nivel: 6 },

  // ================= COMERCIAL E VENDAS =================
  { nome: "CSO / Diretor de Vendas", departamento: "Comercial e Vendas", nivel: 2 },
  { nome: "Diretor Comercial (Vendas)", departamento: "Comercial e Vendas", nivel: 2 },
  { nome: "Head de Vendas", departamento: "Comercial e Vendas", nivel: 3 },
  { nome: "Gerente Comercial", departamento: "Comercial e Vendas", nivel: 3 },
  { nome: "Gerente de Vendas", departamento: "Comercial e Vendas", nivel: 3 },
  { nome: "Gerente de Expansão / Novos Negócios", departamento: "Comercial e Vendas", nivel: 3 },
  { nome: "Coordenador Comercial", departamento: "Comercial e Vendas", nivel: 4 },
  { nome: "Supervisor de Vendas", departamento: "Comercial e Vendas", nivel: 4 },
  { nome: "Executivo de Vendas / Account Executive", departamento: "Comercial e Vendas", nivel: 6 },
  { nome: "Representante Comercial", departamento: "Comercial e Vendas", nivel: 6 },
  { nome: "Vendedor Interno / SDR", departamento: "Comercial e Vendas", nivel: 6 },

  // ================= MARKETING =================
  { nome: "CMO / Diretor de Marketing", departamento: "Marketing", nivel: 2 },
  { nome: "Gerente de Marketing", departamento: "Marketing", nivel: 3 },
  { nome: "Gerente de Marketing Digital", departamento: "Marketing", nivel: 3 },
  { nome: "Coordenador de Marketing", departamento: "Marketing", nivel: 4 },
  { nome: "Analista de Marketing", departamento: "Marketing", nivel: 6 },
  { nome: "Designer / Web Designer", departamento: "Marketing", nivel: 6 },

  // ================= FINANCEIRO =================
  { nome: "CFO / Diretor Financeiro", departamento: "Financeiro", nivel: 2 },
  { nome: "Controller / Gerente de Controladoria", departamento: "Financeiro", nivel: 3 },
  { nome: "Gerente Financeiro", departamento: "Financeiro", nivel: 3 },
  { nome: "Gerente de Contabilidade", departamento: "Financeiro", nivel: 3 },
  { nome: "Coordenador Financeiro", departamento: "Financeiro", nivel: 4 },
  { nome: "Contador", departamento: "Financeiro", nivel: 5 },
  { nome: "Analista Financeiro", departamento: "Financeiro", nivel: 6 },
  { nome: "Assistente Administrativo", departamento: "Financeiro", nivel: 6 },

  // ================= RECURSOS HUMANOS =================
  { nome: "CHRO / Diretor de RH", departamento: "Recursos Humanos", nivel: 2 },
  { nome: "Gerente de RH", departamento: "Recursos Humanos", nivel: 3 },
  { nome: "Gerente de Recrutamento e Seleção", departamento: "Recursos Humanos", nivel: 3 },
  { nome: "Business Partner / BP de RH", departamento: "Recursos Humanos", nivel: 4 },
  { nome: "Coordenador de RH", departamento: "Recursos Humanos", nivel: 4 },
  { nome: "Analista de RH", departamento: "Recursos Humanos", nivel: 6 },
  { nome: "Analista de Recrutamento e Seleção", departamento: "Recursos Humanos", nivel: 6 },
  { nome: "Auxiliar de Departamento Pessoal", departamento: "Recursos Humanos", nivel: 6 },

  // ================= OPERAÇÕES E LOGÍSTICA =================
  { nome: "Diretor de Logística", departamento: "Operações e Logística", nivel: 2 },
  { nome: "Diretor de Supply Chain", departamento: "Operações e Logística", nivel: 2 },
  { nome: "Gerente de Operações", departamento: "Operações e Logística", nivel: 3 },
  { nome: "Gerente de Logística", departamento: "Operações e Logística", nivel: 3 },
  { nome: "Gerente de Frota", departamento: "Operações e Logística", nivel: 3 },
  { nome: "Gerente de Supply Chain", departamento: "Operações e Logística", nivel: 3 },
  { nome: "Gerente de Estoque / Armazém (CD)", departamento: "Operações e Logística", nivel: 3 },
  { nome: "Coordenador de Logística", departamento: "Operações e Logística", nivel: 4 },
  { nome: "Supervisor de Operações", departamento: "Operações e Logística", nivel: 4 },
  { nome: "Supervisor de Frota", departamento: "Operações e Logística", nivel: 4 },
  { nome: "Encarregado de Expedição", departamento: "Operações e Logística", nivel: 4 },
  { nome: "Analista de Logística", departamento: "Operações e Logística", nivel: 6 },
  { nome: "Analista de Planejamento (PCP/PCP-F)", departamento: "Operações e Logística", nivel: 6 },
  { nome: "Motorista Operador", departamento: "Operações e Logística", nivel: 6 },

  // ================= COMPRAS E SUPRIMENTOS =================
  { nome: "Diretor de Suprimentos", departamento: "Compras e Suprimentos", nivel: 2 },
  { nome: "Gerente de Compras", departamento: "Compras e Suprimentos", nivel: 3 },
  { nome: "Coordenador de Compras", departamento: "Compras e Suprimentos", nivel: 4 },
  { nome: "Comprador", departamento: "Compras e Suprimentos", nivel: 6 },
  { nome: "Analista de Compras", departamento: "Compras e Suprimentos", nivel: 6 },
  { nome: "Buyer / Catalog Manager", departamento: "Compras e Suprimentos", nivel: 6 },

  // ================= ENGENHARIA E PRODUÇÃO =================
  { nome: "Diretor Industrial", departamento: "Engenharia e Produção", nivel: 2 },
  { nome: "Diretor de Engenharia", departamento: "Engenharia e Produção", nivel: 2 },
  { nome: "Gerente Industrial", departamento: "Engenharia e Produção", nivel: 3 },
  { nome: "Gerente de Produção / Fábrica", departamento: "Engenharia e Produção", nivel: 3 },
  { nome: "Gerente de Manutenção", departamento: "Engenharia e Produção", nivel: 3 },
  { nome: "Gerente de Qualidade", departamento: "Engenharia e Produção", nivel: 3 },
  { nome: "Engenheiro de Manutenção", departamento: "Engenharia e Produção", nivel: 5 },
  { nome: "Engenheiro de Processo / Qualidade", departamento: "Engenharia e Produção", nivel: 5 },
  { nome: "Coordenador de Produção", departamento: "Engenharia e Produção", nivel: 4 },
  { nome: "Supervisor de Turno / Linha", departamento: "Engenharia e Produção", nivel: 4 },
  { nome: "Técnico de Manutenção", departamento: "Engenharia e Produção", nivel: 6 },
  { nome: "Operador de Máquina / Produção", departamento: "Engenharia e Produção", nivel: 6 },

  // ================= ATENDIMENTO E SUPORTE =================
  { nome: "Gerente de Atendimento / CS", departamento: "Atendimento e Suporte", nivel: 3 },
  { nome: "Coordenador de Atendimento", departamento: "Atendimento e Suporte", nivel: 4 },
  { nome: "Supervisor de Call Center / SAC", departamento: "Atendimento e Suporte", nivel: 4 },
  { nome: "Analista de Customer Success", departamento: "Atendimento e Suporte", nivel: 6 },
  { nome: "Atendente / Operador de Atendimento", departamento: "Atendimento e Suporte", nivel: 6 },

  // ================= JURÍDICO =================
  { nome: "Diretor Jurídico", departamento: "Jurídico", nivel: 2 },
  { nome: "Gerente Jurídico", departamento: "Jurídico", nivel: 3 },
  { nome: "Coordenador Jurídico", departamento: "Jurídico", nivel: 4 },
  { nome: "Advogado(a) / Consultor Jurídico", departamento: "Jurídico", nivel: 5 },

  // ================= SAÚDE =================
  { nome: "Diretor Técnico / Clínico", departamento: "Saúde", nivel: 2 },
  { nome: "Gerente de Enfermagem", departamento: "Saúde", nivel: 3 },
  { nome: "Coordenador Médico", departamento: "Saúde", nivel: 4 },
  { nome: "Farmacêutico(a) Responsável", departamento: "Saúde", nivel: 5 },
  { nome: "Nutricionista Responsável", departamento: "Saúde", nivel: 5 },
  { nome: "Enfermeiro(a) Chefe", departamento: "Saúde", nivel: 4 },
  { nome: "Dentista / Odontólogo Responsável", departamento: "Saúde", nivel: 5 },

  // ================= DADOS E INOVAÇÃO =================
  { nome: "CDO / Diretor de Dados", departamento: "Dados e Inovação", nivel: 2 },
  { nome: "Gerente de BI", departamento: "Dados e Inovação", nivel: 3 },
  { nome: "Coordenador de dados / Analytics", departamento: "Dados e Inovação", nivel: 4 },
  { nome: "Cientista de Dados", departamento: "Dados e Inovação", nivel: 5 },
  { nome: "Analista de BI", departamento: "Dados e Inovação", nivel: 6 },
];

export function normalizarCargo(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buscarCargos(busca: string, limite = 30): Cargo[] {
  const termo = normalizarCargo(busca);

  if (!termo) {
    return [];
  }

  return CATALOGO_CARGOS.filter((cargo) => {
    const nomeNorm = normalizarCargo(cargo.nome);
    const deptoNorm = normalizarCargo(cargo.departamento);
    return (
      nomeNorm.includes(termo) ||
      termo.split(" ").every((palavra) => nomeNorm.includes(palavra)) ||
      deptoNorm.includes(termo)
    );
  }).slice(0, limite);
}

// Ordena os cargos escolhidos pelo nível de autoridade do catálogo.
// Cargos fora do catálogo ficam por último, mantendo a ordem digitada.
export function ordenarPorAutoridade(cargosEscolhidos: string[]): string[] {
  const mapaNivel = new Map<string, number>();
  CATALOGO_CARGOS.forEach((cargo) => {
    mapaNivel.set(normalizarCargo(cargo.nome), cargo.nivel);
  });

  return [...cargosEscolhidos].sort((a, b) => {
    const nivelA = mapaNivel.get(normalizarCargo(a)) ?? 99;
    const nivelB = mapaNivel.get(normalizarCargo(b)) ?? 99;
    return nivelA - nivelB;
  });
}

const ROTULOS_NIVEL: Record<number, string> = {
  1: "Dono / C-Level",
  2: "Diretoria",
  3: "Gerência",
  4: "Coordenação",
  5: "Especialista",
  6: "Analista / Pleno",
};

export function rotuloNivel(nivel: number): string {
  return ROTULOS_NIVEL[nivel] ?? "Outros";
}
