-- Cobrança: compras sem cadastro (pending_grants), ordem de eventos e regra de acesso refinada.

alter table public.subscriptions add column if not exists last_event_at timestamptz;

-- Compra feita por e-mail que ainda não tem conta: vira assinatura quando a pessoa se cadastrar.
create table public.pending_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  origin public.subscription_origin not null,
  external_id text not null,
  status public.subscription_status not null,
  valid_until timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  unique (origin, external_id)
);
create index pending_grants_email_idx on public.pending_grants (lower(email));
alter table public.pending_grants enable row level security;
revoke all on public.pending_grants from anon, authenticated;

-- Acesso: ativa dentro da validade; cancelada mantém o período já pago; reembolso, chargeback e atraso bloqueiam na hora.
create or replace function public.has_active_access(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.access = 'active')
    and exists (
      select 1 from public.subscriptions s
      where s.student_id = uid
        and s.status in ('active', 'canceled')
        and (s.valid_until is null and s.status = 'active' or s.valid_until > now())
    )
$$;

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

  insert into public.subscriptions (student_id, status, origin, external_id, valid_until, last_event_at)
  select new.id, g.status, g.origin, g.external_id, g.valid_until, g.last_event_at
  from public.pending_grants g where lower(g.email) = lower(new.email)
  on conflict (origin, external_id) do nothing;
  delete from public.pending_grants where lower(email) = lower(new.email);
  return new;
end $$;
