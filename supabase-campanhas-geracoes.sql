-- Remove o limite artificial de três gerações por campanha.
alter table public.campanhas
  drop constraint if exists campanhas_geracoes_usadas_check;

alter table public.campanhas
  add constraint campanhas_geracoes_usadas_check check (geracoes_usadas >= 0);
