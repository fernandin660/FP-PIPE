-- ============================================================
-- MIGRATION: NOVO MODELO DE TESTE GRÁTIS (v2 — blindada)
-- Novos usuários que criarem conta (signup "teste grátis") ganham:
--   • 1 geração de lista        (creditos = 1)
--   • saldo p/ desbloquear até 25 leads (creditos_contatos = 25)
--   • pequeno bônus de abordagem IA para experimentar (creditos_ia = 2)
-- Se quiser mais, precisam assinar um plano.
-- O usuário particular gerente.teste (plano gold) NÃO é afetado.
--
-- IMPORTANTE (v2): o trigger NUNCA pode fazer o signup falhar. Cada bloco
-- de INSERT é protegido por EXCEPTION — se um saldo/org falhar por qualquer
-- motivo (constraint, RLS, coluna nova), ele apenas loga um WARNING e segue,
-- permitindo que a conta seja criada. Assim o cadastro nunca fica em
-- 'Aguarde...' nem mostra 'Não foi possível criar a conta' por causa do
-- trigger.
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
  begin
    insert into public.organizacoes (nome, dono_id)
    values ('Minha Empresa', new.id)
    returning id into nova_org_id;
  exception when others then
    raise warning 'preparar_novo_usuario: falha ao criar organizacao (%): %', sqlerrm, new.id;
    nova_org_id := null;
  end;

  -- Insere o usuário como admin da organização
  if nova_org_id is not null then
    begin
      insert into public.organizacao_membros (organizacao_id, usuario_id, papel, status)
      values (nova_org_id, new.id, 'admin', 'ativo');
    exception when others then
      raise warning 'preparar_novo_usuario: falha ao criar membro (%): %', sqlerrm, new.id;
    end;

    -- Cria assinatura teste vinculada à org
    begin
      insert into public.assinaturas (usuario_id, plano, status, origem, organizacao_id)
      values (new.id, 'teste', 'ativa', 'signup', nova_org_id)
      on conflict (usuario_id) do update
        set organizacao_id = nova_org_id;
    exception when others then
      raise warning 'preparar_novo_usuario: falha ao criar assinatura (%): %', sqlerrm, new.id;
    end;

    -- Saldos vinculados à org (NOVO MODELO)
    begin
      insert into public.creditos_contatos (usuario_id, saldo, organizacao_id)
      values (new.id, 25, nova_org_id)
      on conflict (usuario_id) do update
        set organizacao_id = nova_org_id;
    exception when others then
      raise warning 'preparar_novo_usuario: falha creditos_contatos (%): %', sqlerrm, new.id;
    end;

    begin
      insert into public.creditos (usuario_id, saldo, organizacao_id)
      values (new.id, 1, nova_org_id)
      on conflict (usuario_id) do update
        set organizacao_id = nova_org_id;
    exception when others then
      raise warning 'preparar_novo_usuario: falha creditos (%): %', sqlerrm, new.id;
    end;

    begin
      insert into public.creditos_ia (usuario_id, saldo, organizacao_id)
      values (new.id, 2, nova_org_id)
      on conflict (usuario_id) do update
        set organizacao_id = nova_org_id;
    exception when others then
      raise warning 'preparar_novo_usuario: falha creditos_ia (%): %', sqlerrm, new.id;
    end;
  end if;

  return new;
end;
$$;

-- Garante que o trigger continua apontando para a função atualizada
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.preparar_novo_usuario();
