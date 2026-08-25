-- Marca quando o contato de uma empresa foi desbloqueado (pago com
-- crédito de buscador). Só leads com esta coluna preenchida podem
-- entrar em listas salvas — fecha a brecha de salvar "às cegas".
alter table public.companies
  add column if not exists contato_desbloqueado_em timestamptz;
