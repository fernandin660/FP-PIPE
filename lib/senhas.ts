// Política de senhas do FP Pipe.
export function validarSenhaForca(senha: string): string | null {
  if (!senha || senha.length < 8) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (!/[a-zA-Z]/.test(senha)) {
    return "A senha precisa ter pelo menos uma letra.";
  }
  if (!/[0-9]/.test(senha)) {
    return "A senha precisa ter pelo menos um número.";
  }
  return null;
}
