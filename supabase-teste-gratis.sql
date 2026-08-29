-- ============================================================
-- MIGRATION: NOVO MODELO DE TESTE GRÁTIS
-- Novos usuários que criarem conta (signup "teste grátis") ganham:
--   • 1 geração de lista        (creditos = 1)
--   • saldo p/ desbloquear até 25 leads (creditos_contatos = 25)
--   • pequeno bônus de abordagem IA para experimentar (creditos_ia = 2)
-- Se quiser mais, precisam assinar um plano.
-- O usuário particular gerente.teste (plano gold) NÃO é afetado.
--
-- Como executar: SQL Editor do Supabase (demonstração, bloco inteiro).
-- ============================================================

create or replace function public.preparar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_org_id uuid;
begin
  -- Cria organização do novo usuário
  insert into public.organizacoes (nome, dono_id)
  values ('Minha Empresa', new.id)
  returning id into nova_org_id;

  -- Insere o usuário como admin da organização
  insert into public.organizacao_membros (organizacao_id, usuario_id, papel, status)
  values (nova_org_id, new.id, 'admin', 'ativo');

  -- Cria assinatura teste vinculada à org
  insert into public.assinaturas (usuario_id, plano, status, origem, organizacao_id)
  values (new.id, 'teste', 'ativa', 'signup', nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  -- Saldos vinculados à org (NOVO MODELO)
  insert into public.creditos_contatos (usuario_id, saldo, organizacao_id)
  values (new.id, 25, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  insert into public.creditos (usuario_id, saldo, organizacao_id)
  values (new.id, 1, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  insert into public.creditos_ia (usuario_id, saldo, organizacao_id)
  values (new.id, 2, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  return new;
end;
$$;

-- Garante que o trigger continua apontando para a função atualizada
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.preparar_novo_usuario();
