-- ============================================================
-- SEGURANÇA: funções de saldo só podem ser chamadas pelo servidor
-- Aplicado em produção em 2026-11-09.
--
-- Antes: creditar/debitar_saldo_* eram SECURITY DEFINER e executáveis
-- por anon/authenticated via /rest/v1/rpc. Qualquer pessoa com a chave
-- pública podia creditar saldo ilimitado ou zerar saldo de qualquer org.
-- O código só chama essas funções com o client admin (service_role).
-- ============================================================

revoke execute on function public.creditar_saldo_org(text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.creditar_saldo_usuario(text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.debitar_saldo_org(text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.debitar_saldo_usuario(text, uuid, integer) from public, anon, authenticated;

grant execute on function public.creditar_saldo_org(text, uuid, integer) to service_role;
grant execute on function public.creditar_saldo_usuario(text, uuid, integer) to service_role;
grant execute on function public.debitar_saldo_org(text, uuid, integer) to service_role;
grant execute on function public.debitar_saldo_usuario(text, uuid, integer) to service_role;
