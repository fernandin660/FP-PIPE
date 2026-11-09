// Política de senhas do FP Pipe.
// O Supabase exige, no mínimo: 8+ caracteres com letra minúscula, letra
// maiúscula, número E caractere especial. Manter alinhado a essa política
// para o cadastro não ser rejeitado no backend (HTTP 422).
export function validarSenhaForca(senha: string): string | null {
  if (!senha || senha.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (!/[a-z]/.test(senha)) {
    return "A senha precisa ter uma letra minúscula.";
  }
  if (!/[A-Z]/.test(senha)) {
    return "A senha precisa ter uma letra maiúscula.";
  }
  if (!/[0-9]/.test(senha)) {
    return "A senha precisa ter um número.";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(senha)) {
    return "A senha precisa ter um caractere especial (ex.: ! @ # $ %).";
  }
  return null;
}

/**
 * Checa se a senha já apareceu em vazamentos públicos (HaveIBeenPwned),
 * a mesma base que o Supabase usa no plano Pro.
 *
 * Usa k-anonimato: só os 5 primeiros caracteres do hash SHA-1 saem do
 * navegador — a senha (e o hash completo) nunca são enviados. Se o serviço
 * estiver fora do ar, não bloqueia o usuário.
 */
export async function senhaFoiVazada(senha: string): Promise<boolean> {
  try {
    const bytes = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(senha));
    const hash = Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefixo = hash.slice(0, 5);
    const sufixo = hash.slice(5);
    const resposta = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) return false;
    const corpo = await resposta.text();
    return corpo.split("\n").some((linha) => {
      const [suf, contagem] = linha.trim().split(":");
      return suf === sufixo && Number(contagem) > 0;
    });
  } catch {
    return false;
  }
}

export const MENSAGEM_SENHA_VAZADA =
  "Essa senha já apareceu em vazamentos de dados na internet. Escolha outra.";
