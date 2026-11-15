-- Excluir o usuário em auth.users apaga o perfil e, em cascata, todos os dados de estudo (LGPD: exclusão pelo titular).
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;
