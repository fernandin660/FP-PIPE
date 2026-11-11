-- ============================================================
-- CRM — correções da varredura de 2026-11-10
-- Aplicado em produção via migration "crm_correcoes_2026_11".
-- ============================================================

-- 1. Remover um lead apagava TODO o histórico dele (atividades, notas,
--    mudanças de estágio) por causa do ON DELETE CASCADE, e o registro
--    "lead_removido" falhava. Agora o histórico fica (ligado à empresa).
alter table public.pipeline_historico
  drop constraint pipeline_historico_lead_pipeline_id_fkey;
alter table public.pipeline_historico
  add constraint pipeline_historico_lead_pipeline_id_fkey
  foreign key (lead_pipeline_id) references public.lead_pipeline(id) on delete set null;

-- 2. Não existia permissão de DELETE no histórico: "excluir atividade"
--    respondia sucesso sem apagar nada. Só atividades manuais podem sair.
drop policy if exists crm_historico_delete on public.pipeline_historico;
create policy crm_historico_delete on public.pipeline_historico
  for delete to authenticated
  using (
    organizacao_id is not null
    and public._usuario_membro(organizacao_id)
    and tipo_evento = 'atividade'
  );

-- 3. O filtro de e-mails inválidos também era aplicado ao ASSUNTO e ao
--    CORPO da primeira abordagem (email_assunto/email_corpo), apagando o
--    texto a cada gravação da empresa. Agora só filtra endereços.
create or replace function public."public._fp_trigger_companies"()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.email := public._fp_email_valido(NEW.email::text);
  NEW.aprovador_email := public._fp_email_valido(NEW.aprovador_email::text);
  NEW.campeao_email := public._fp_email_valido(NEW.campeao_email::text);
  NEW.emails_extra := public._fp_filtra_emails_array(NEW.emails_extra);
  return NEW;
end
$$;

-- 4. Organizações criadas depois do seed inicial ficaram sem estágios e
--    sem modelos de cadência. (O app também semeia sob demanda.)
do $$
declare r record;
begin
  for r in select id from public.organizacoes loop
    perform public._crm_seed_estagios(r.id);
    perform public._crm_seed_cadencia_padrao(r.id);
    perform public._crm_seed_cadencia_extra(r.id);
  end loop;
end $$;
