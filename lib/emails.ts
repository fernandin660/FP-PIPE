// ============================================================
// Utilitários centralizados de validação/sanitização de e-mail.
//
// Fonte única: o filtro de "e-mail sujo" deve ser aplicado na
// ENTRADA dos dados (rotas de API e camada de app), não apenas
// na montagem da campanha. Evita que domínios placeholder,
// descartáveis e artefatos de scraper entrem no banco.
// ============================================================

// Extensões de arquivo disfarçadas de e-mail e lixo de scraper.
const EXTENSOES_LIXO = /\.(png|jpe?g|gif|webp|svg|css|js|pdf|ico)$/i;

// Domínios placeholder / de exemplo — nunca são e-mails reais de contato.
const DOMINIOS_EXEMPLO = [
  "example.com",
  "example.org",
  "example.net",
  "example.co",
  "domain.com",
  "yourdomain",
  "yourdomain.com",
  "email.com",
  "emailexample",
  "akademeia",
  "yopmail", // descartável de exemplo
];

// Serviços de e-mail descartável / temporário — não valem como contato.
const DOMINIOS_DESCARTAVEIS = [
  "mailinator.com",
  "mailinator.net",
  "yopmail.com",
  "yopmail.fr",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamail.biz",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "trashmail.com",
  "sharklasers.com",
  "spam4.me",
  "mytemp.email",
  "getnada.com",
  "inboxbear.com",
  "dispostable.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailcatch.com",
  "1secmail.com",
  "luxusmail.org",
  "spambox.us",
  "burnermail.io",
  "tmpmail.org",
  "fakemail.net",
  "maildump.com",
];

// Endereços de armaradilha anti-scraper comuns.
const SUBSTRING_LIXO = [
  "category_",
  "recipient",
  "spam@",
  "@sentry.",
  "wixpress.com",
  "parastorage.com",
  "cloudflare",
  "@example.",
];

function temSubstringLixo(email: string): boolean {
  const em = email.toLowerCase();
  return SUBSTRING_LIXO.some((lixo) => em.includes(lixo.toLowerCase()));
}

function dominioBloqueado(email: string): boolean {
  const em = email.toLowerCase();
  if (EXTENSOES_LIXO.test(em)) return true;
  const at = em.lastIndexOf("@");
  if (at === -1) return false;
  const dominio = em.slice(at + 1);
  return (
    DOMINIOS_EXEMPLO.includes(dominio) ||
    DOMINIOS_DESCARTAVEIS.includes(dominio) ||
    DOMINIOS_EXEMPLO.some((d) => dominio === d || dominio.endsWith("." + d)) ||
    DOMINIOS_DESCARTAVEIS.some((d) => dominio.endsWith(d))
  );
}

// Normaliza (trim/lowercase/remove pontas .-_) e retorna o e-mail limpo,
// ou null se não passar na validação de formato.
export function sanitizarEmail(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .trim()
    .toLowerCase()
    .replace(/^[.\-_]+|[.\-_]+$/g, "");
  if (limpo.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(limpo)) return null;
  return limpo;
}

// Valida um e-mail (semplica normalizado) pelo formato básico + regras de
// sujeira (placeholder, descartável, arquivo, lixo de scraper).
export function emailValido(valor: unknown): valor is string {
  const limpo = sanitizarEmail(valor);
  if (!limpo) return false;
  return !dominioBloqueado(limpo) && !temSubstringLixo(limpo);
}

// Filtra um array, mantendo apenas e-mails válidos (e sanitizados).
export function filtrarEmails(valores: unknown[] | undefined | null): string[] {
  if (!Array.isArray(valores)) return [];
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const item of valores) {
    const limpo = sanitizarEmail(item);
    if (!limpo || !emailValido(limpo)) continue;
    if (vistos.has(limpo)) continue;
    vistos.add(limpo);
    resultado.push(limpo);
  }
  return resultado;
}
