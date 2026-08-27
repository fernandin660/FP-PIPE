-- FP Pipe - compartilhar contatos pesquisados com a organização.
-- Execute depois de supabase-contatos.sql e supabase-contatos-v3.sql.

alter table public.contatos
  add column if not exists organizacao_id uuid references public.organizacoes(id);

update public.contatos c
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = c.usuario_id
  and m.status = 'ativo'
  and c.organizacao_id is null;

create index if not exists contatos_organizacao_linkedin_idx
  on public.contatos (organizacao_id, linkedin_url);

drop policy if exists "Dono gerencia seus contatos" on public.contatos;
drop policy if exists "Membros da organizacao gerenciam contatos" on public.contatos;

create policy "Membros da organizacao gerenciam contatos"
  on public.contatos
  for all
  using (
    public._usuario_membro(organizacao_id)
    or auth.uid() = usuario_id
  )
  with check (
    public._usuario_membro(organizacao_id)
    or auth.uid() = usuario_id
  );
