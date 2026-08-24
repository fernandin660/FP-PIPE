-- ============================================================
-- SEGURANCA DAS MOEDAS (v2)
-- Usuario pode apenas LER seus saldos e consumo.
-- Toda escrita (debito/credito) acontece pelo servidor com a
-- service_role. Isso impede o proprio usuario de zerar o uso
-- mensal ou inflar saldos direto pelo console do navegador.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

do $$
declare
  tabelas text[] := array['uso_mensal', 'creditos', 'creditos_contatos', 'creditos_ia'];
  t text;
  pol record;
begin
  foreach t in array tabelas loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

alter table public.uso_mensal        enable row level security;
alter table public.creditos          enable row level security;
alter table public.creditos_contatos enable row level security;
alter table public.creditos_ia       enable row level security;

create policy "uso_mensal_leitura" on public.uso_mensal
  for select using (auth.uid() = usuario_id);

create policy "creditos_leitura" on public.creditos
  for select using (auth.uid() = usuario_id);

create policy "creditos_contatos_leitura" on public.creditos_contatos
  for select using (auth.uid() = usuario_id);

create policy "creditos_ia_leitura" on public.creditos_ia
  for select using (auth.uid() = usuario_id);

-- Confere: cada tabela deve ter exatamente 1 policy, somente SELECT.
select tablename, policyname, cmd from pg_policies
where schemaname = 'public'
  and tablename in ('uso_mensal','creditos','creditos_contatos','creditos_ia');
