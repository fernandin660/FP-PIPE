-- Aplicada em produção em 2026-11-10 (migration crm_motivo_perda_probabilidade).
-- Motivo de perda do lead e probabilidade de fechamento por estágio (previsão de receita).
alter table public.lead_pipeline add column if not exists motivo_perda text;
alter table public.pipeline_stages add column if not exists probabilidade smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pipeline_stages_probabilidade_faixa') then
    alter table public.pipeline_stages
      add constraint pipeline_stages_probabilidade_faixa check (probabilidade is null or (probabilidade between 0 and 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lead_pipeline_motivo_perda_tamanho') then
    alter table public.lead_pipeline
      add constraint lead_pipeline_motivo_perda_tamanho check (motivo_perda is null or char_length(motivo_perda) <= 300);
  end if;
end $$;

update public.pipeline_stages set probabilidade = case upper(nome)
  when 'NOVO' then 5 when 'EM ABORDAGEM' then 10 when 'CONTATO REALIZADO' then 15
  when 'FOLLOW-UP' then 20 when 'RESPONDEU' then 30 when 'QUALIFICADO' then 40
  when 'REUNIÃO AGENDADA' then 50 when 'OPORTUNIDADE' then 70 when 'GANHO' then 100
  when 'PERDIDO' then 0 else null end
where probabilidade is null;

-- Admin pode ajustar estágios (ex.: probabilidade) — migration crm_stages_update_admin.
drop policy if exists "crm_stages_update_admin" on public.pipeline_stages;
create policy "crm_stages_update_admin" on public.pipeline_stages
  for update
  using (organizacao_id is not null and public._usuario_admin(organizacao_id))
  with check (organizacao_id is not null and public._usuario_admin(organizacao_id));
