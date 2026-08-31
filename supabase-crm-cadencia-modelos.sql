-- ============================================================
-- Modelos de cadência adicionais (idempotente)
-- Aplica para TODAS as organizações (via função helper).
-- ============================================================

create or replace function public._crm_seed_cadencia_extra(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cad_id uuid;
begin
  -- 1. Prospecção fria
  if not exists (
    select 1 from public.cadencia where organizacao_id = org_id and nome = 'Prospecção fria'
  ) then
    insert into public.cadencia (organizacao_id, nome, descricao)
    values (org_id, 'Prospecção fria', 'Primeiro contato com quem ainda não te conhece: e-mail frio, conexão e follow-ups espaçados.')
    returning id into cad_id;

    insert into public.cadencia_etapas (cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script) values
      (cad_id, 0, 'email',    'E-mail frio de apresentação',            0,  'Apresentação curta e direta, citando um problema comum do nicho.'),
      (cad_id, 1, 'whatsapp', 'Mensagem de prospecção no WhatsApp',     2,  'Mensagem rápida reforçando o e-mail e propondo 10 minutos.'),
      (cad_id, 2, 'linkedin', 'Pedido de conexão e follow-up',          5,  'Conecte e envie mensagem de follow-up com um gancho de valor.'),
      (cad_id, 3, 'email',    'Reativação',                             9,  'Novo e-mail com um case ou dado relevante do mercado.'),
      (cad_id, 4, 'telefone', 'Ligação de encerramento',                12, 'Última tentativa por telefone; encerre se não houver resposta.');
  end if;

  -- 2. Hots / lead quente
  if not exists (
    select 1 from public.cadencia where organizacao_id = org_id and nome = 'Lead quente'
  ) then
    insert into public.cadencia (organizacao_id, nome, descricao)
    values (org_id, 'Lead quente', 'Para quem já demonstrou interesse: agilidade na marcação de reunião e proposta.')
    returning id into cad_id;

    insert into public.cadencia_etapas (cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script) values
      (cad_id, 0, 'whatsapp', 'Contato imediato de interesse',          0,  'Responda rápido agradecendo o interesse e proponha reunião.'),
      (cad_id, 1, 'telefone', 'Ligação para agendar reunião',           1,  'Ligue para confirmar horário e levantar necessidades.'),
      (cad_id, 2, 'email',    'Material e proposta da reunião',         2,  'Envie a pauta, material de apoio e próximos passos.'),
      (cad_id, 3, 'tarefa',   'Follow-up pós-reunião',                  3,  'Retome os pontos combinados e envie proposta/condições.');
  end if;

  -- 3. Reativação de base
  if not exists (
    select 1 from public.cadencia where organizacao_id = org_id and nome = 'Reativação de base'
  ) then
    insert into public.cadencia (organizacao_id, nome, descricao)
    values (org_id, 'Reativação de base', 'Para contatos antigos ou inativos: reativar com novidade e valor.')
    returning id into cad_id;

    insert into public.cadencia_etapas (cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script) values
      (cad_id, 0, 'email',    'E-mail de reativação com novidade',       0,  'Cite uma novidade/produto novo e pergunte se faz sentido retomar.'),
      (cad_id, 1, 'linkedin', 'Conexão e mensagem de reengajamento',     3,  'Mensagem lembrando do contato anterior e trazendo um gancho.'),
      (cad_id, 2, 'telefone', 'Ligação de reengajamento',                7,  'Ligue para retomar o relacionamento e atualizar o cenário.'),
      (cad_id, 3, 'email',    'Último e-mail com case',                  10, 'Envie um case de sucesso e uma oferta de reunião curta.');
  end if;

  -- 4. Encerramento / negociação
  if not exists (
    select 1 from public.cadencia where organizacao_id = org_id and nome = 'Encerramento / negociação'
  ) then
    insert into public.cadencia (organizacao_id, nome, descricao)
    values (org_id, 'Encerramento / negociação', 'Para leads em estágio de proposta: cobrança de retorno e negociação.')
    returning id into cad_id;

    insert into public.cadencia_etapas (cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script) values
      (cad_id, 0, 'email',    'Acompanhamento da proposta',             0,  'Pergunte se houve tempo de analisar a proposta e esclareça dúvidas.'),
      (cad_id, 1, 'telefone', 'Ligação de negociação',                  2,  'Ligue para negociar condições e desbloquear a decisão.'),
      (cad_id, 2, 'email',    'Recapitulação e próximos passos',        4,  'Recapitule valores e combine os próximos passos da assinatura.'),
      (cad_id, 3, 'tarefa',   'Encerramento interno',                   7,  'Registre o desfecho (fechado, perdido ou adiado).');
  end if;
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from public.organizacoes loop
    perform public._crm_seed_cadencia_extra(r.id);
  end loop;
end;
$$;
