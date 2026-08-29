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
