-- Migra a unidade antiga (10 créditos por telefone) para a nova unidade
-- (1 crédito por telefone). Execute uma única vez.
update public.creditos_telefone
set saldo = floor(saldo / 10),
    atualizado_em = now();
