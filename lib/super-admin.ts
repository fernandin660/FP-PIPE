import type { User } from "@supabase/supabase-js";

const EMAIL_DONO = (
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br"
).toLowerCase();

/**
 * Dono do produto (painel /admin). Exige o e-mail do dono E que ele esteja
 * confirmado — sem a confirmação, quem conseguisse cadastrar/alterar uma
 * conta com esse e-mail ganharia acesso ao painel administrativo.
 */
export function ehDonoDoProduto(user: User | null | undefined): boolean {
  if (!user || !user.email || !user.email_confirmed_at) return false;
  return user.email.toLowerCase() === EMAIL_DONO;
}
