-- Funções auxiliares só para usuários autenticados, e sem permitir sondar o acesso de terceiros.
create or replace function public.has_active_access(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (uid = auth.uid() or auth.uid() is null or public.is_staff())
    and exists (select 1 from public.profiles p where p.id = uid and p.access = 'active')
    and exists (
      select 1 from public.subscriptions s
      where s.student_id = uid
        and s.status in ('active', 'canceled')
        and (s.valid_until is null and s.status = 'active' or s.valid_until > now())
    )
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
