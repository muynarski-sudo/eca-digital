-- Venda via Hotmart descartada: o acesso é concedido manualmente pela professora.
-- Remove o log de webhooks, as compras pendentes e a coluna de ordenação de eventos.
-- (O valor 'hotmart' do enum subscription_origin permanece, pois enums não perdem valores com segurança.)
drop table if exists public.webhook_events;
drop table if exists public.pending_grants;
alter table public.subscriptions drop column if exists last_event_at;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name', ''), 'student')
  on conflict (id) do nothing;

  insert into public.teacher_students (teacher_id, student_id)
  select i.teacher_id, new.id from public.invites i
  where lower(i.email) = lower(new.email) and i.accepted_at is null
  on conflict do nothing;
  update public.invites set accepted_at = now() where lower(email) = lower(new.email) and accepted_at is null;
  return new;
end $$;
