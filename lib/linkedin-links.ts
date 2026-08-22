// Utilitários para montar links de busca no LinkedIn.
// O LinkedIn proíbe coleta automática de perfis, então trabalhamos
// com URLs de busca prontas para clicar (empresa e pessoas por cargo).

export function limparNomeEmpresa(nome: string): string {
  return nome
    .replace(
      /\s*(LTDA|L\.T\.D\.A|S\/A|S\.A|SA|EIRELI|ME|EPP|EMPRESA INDIVIDUAL|SOCIEDADE SIMPLES|EDIFICIO|CONDOMINIO)\b.*$/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function gerarLinkBuscaEmpresa(
  nomeFantasia?: string | null,
  razaoSocial?: string | null
): string {
  const termo = limparNomeEmpresa(nomeFantasia || razaoSocial || "");
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(termo)}`;
}

export function gerarLinkBuscaPessoas(
  cargo: string,
  nomeFantasia?: string | null,
  razaoSocial?: string | null
): string {
  const termo = `${cargo} ${limparNomeEmpresa(nomeFantasia || razaoSocial || "")}`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(termo)}`;
}
