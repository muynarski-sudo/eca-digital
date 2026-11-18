-- Falando Francês Prática: instalação do banco (gerado por scripts/build-setup-sql.sh; não edite à mão).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Rode UMA vez em um projeto novo.

-- ===== 20260101000001_schema.sql =====
-- Falando Francês Prática: esquema base.
-- Conteúdo (units, vocab_items, questions) usa ids de texto estáveis vindos de content/data.

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.access_status as enum ('active', 'paused');
create type public.subscription_status as enum ('active', 'past_due', 'canceled', 'refunded', 'chargeback');
create type public.subscription_origin as enum ('manual', 'hotmart');
create type public.assignment_status as enum ('assigned', 'in_progress', 'submitted', 'reviewed');

create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text,
  role public.user_role not null default 'student',
  access public.access_status not null default 'active',
  level text not null default 'A1',
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create unique index profiles_email_key on public.profiles (lower(email));

create table public.teacher_students (
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, student_id),
  check (teacher_id <> student_id)
);
create index teacher_students_student_idx on public.teacher_students (student_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index invites_email_idx on public.invites (lower(email));

-- Conteúdo
create table public.units (
  id text primary key,
  level text not null default 'A1',
  ord int not null,
  chapter int,
  title text not null,
  objective text not null,
  summary text not null
);

create table public.vocab_items (
  id text primary key,
  unit_id text not null references public.units (id) on delete cascade,
  category text not null,
  fr text not null,
  pt text not null,
  pron text,
  example_fr text,
  example_pt text,
  source text not null check (source in ('ebook', 'generated')),
  needs_review boolean not null default false,
  active boolean not null default true
);
create index vocab_items_unit_idx on public.vocab_items (unit_id);

create table public.questions (
  id text primary key,
  unit_id text references public.units (id) on delete cascade,
  type text not null check (type in ('fill_blank','multiple_choice','translate_pt_fr','order_words','match_pairs','write_out','conjugate','dictation','speak')),
  skill text not null check (skill in ('vocabulario','gramatica','escuta','fala')),
  prompt text not null,
  answers jsonb not null default '[]',
  choices jsonb,
  pairs jsonb,
  words jsonb,
  audio_text text,
  hint text,
  explanation text not null,
  error_tags text[] not null default '{}',
  difficulty int not null check (difficulty between 1 and 3),
  source text not null check (source in ('ebook', 'generated')),
  needs_review boolean not null default false,
  active boolean not null default true
);
create index questions_unit_idx on public.questions (unit_id);

-- Prática do aluno
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  correct boolean not null,
  verdict text not null check (verdict in ('correct', 'almost', 'wrong')),
  score numeric not null check (score between 0 and 1),
  response text,
  elapsed_ms int not null default 0,
  error_tags text[] not null default '{}',
  assignment_id uuid,
  created_at timestamptz not null default now()
);
create index attempts_student_idx on public.attempts (student_id, created_at desc);

create table public.srs_cards (
  student_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  item_kind text not null default 'question' check (item_kind in ('question', 'vocab', 'conjugation')),
  ease numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  primary key (student_id, item_id)
);
create index srs_cards_due_idx on public.srs_cards (student_id, due_at);

create table public.item_mastery (
  student_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null,
  mastery numeric not null default 0 check (mastery between 0 and 1),
  last_practiced_at timestamptz,
  primary key (student_id, item_id)
);

create table public.unit_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  unit_id text not null references public.units (id) on delete cascade,
  mastery numeric not null default 0 check (mastery between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (student_id, unit_id)
);

-- Liberação manual feita pela professora (separada de unit_progress para o aluno não poder se liberar).
create table public.unit_unlocks (
  student_id uuid not null references public.profiles (id) on delete cascade,
  unit_id text not null references public.units (id) on delete cascade,
  unlocked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, unit_id)
);

create table public.skill_scores (
  student_id uuid not null references public.profiles (id) on delete cascade,
  skill text not null check (skill in ('vocabulario','gramatica','escuta','fala')),
  score numeric not null default 0 check (score between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (student_id, skill)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  unit_id text references public.units (id) on delete set null,
  question_ids text[],
  due_at timestamptz not null,
  status public.assignment_status not null default 'assigned',
  teacher_grade numeric check (teacher_grade between 0 and 10),
  teacher_feedback text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reminder_sent_at timestamptz,
  check (unit_id is not null or (question_ids is not null and cardinality(question_ids) > 0))
);
create index assignments_student_idx on public.assignments (student_id, due_at);
create index assignments_teacher_idx on public.assignments (teacher_id, status);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.subscription_status not null,
  origin public.subscription_origin not null,
  external_id text,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origin, external_id)
);
create index subscriptions_student_idx on public.subscriptions (student_id);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_type text,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  detail text,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

-- LGPD
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('privacy', 'terms')),
  version int not null,
  title text not null,
  body_md text not null,
  published_at timestamptz not null default now(),
  unique (kind, version)
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'terms', 'age_notice')),
  version int not null,
  accepted_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, version);

create table public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index voice_recordings_expiry_idx on public.voice_recordings (expires_at);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  kind text not null,
  ref_id text,
  sent_at timestamptz not null default now()
);
create unique index notification_log_dedupe on public.notification_log (user_id, channel, kind, coalesce(ref_id, ''));

-- ===== 20260101000002_rls.sql =====
-- Funções de apoio, gatilhos de proteção e políticas de Row Level Security.

-- ---------- funções (security definer: leem sem recursão de RLS) ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin'))
$$;

create or replace function public.is_teacher_of(student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_students ts
    join public.profiles p on p.id = ts.teacher_id
    where ts.teacher_id = auth.uid() and ts.student_id = student and p.role in ('teacher', 'admin')
  )
$$;

-- Acesso = perfil ativo + assinatura ativa e dentro da validade (manual ou Hotmart).
create or replace function public.has_active_access(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.access = 'active')
    and exists (
      select 1 from public.subscriptions s
      where s.student_id = uid and s.status = 'active' and (s.valid_until is null or s.valid_until > now())
    )
$$;

-- ---------- criação do perfil ao cadastrar ----------
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- gatilhos de proteção de colunas ----------
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.id <> old.id or new.email <> old.email or new.role <> old.role or new.level <> old.level or new.created_at <> old.created_at then
    raise exception 'campo protegido do perfil' using errcode = '42501';
  end if;
  if auth.uid() <> old.id and new.full_name is distinct from old.full_name then
    raise exception 'apenas o próprio usuário altera o nome' using errcode = '42501';
  end if;
  if new.access <> old.access and not public.is_teacher_of(old.id) then
    raise exception 'apenas a professora vinculada ou o admin altera o acesso' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

create or replace function public.assignments_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() or auth.uid() = old.teacher_id then
    return new;
  end if;
  -- o aluno só pode andar com o status e marcar a entrega
  if new.teacher_id <> old.teacher_id or new.student_id <> old.student_id or new.title <> old.title
     or new.unit_id is distinct from old.unit_id or new.question_ids is distinct from old.question_ids
     or new.due_at <> old.due_at or new.teacher_grade is distinct from old.teacher_grade
     or new.teacher_feedback is distinct from old.teacher_feedback or new.reviewed_at is distinct from old.reviewed_at
     or new.status = 'reviewed' then
    raise exception 'o aluno só altera status e entrega' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger assignments_guard before update on public.assignments for each row execute function public.assignments_guard();

-- ---------- privilégios mínimos ----------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.legal_documents to anon, authenticated;
grant select on public.profiles, public.teacher_students, public.invites, public.units, public.vocab_items, public.questions,
  public.attempts, public.srs_cards, public.item_mastery, public.unit_progress, public.unit_unlocks, public.skill_scores,
  public.assignments, public.subscriptions, public.consents, public.voice_recordings, public.webhook_events to authenticated;
grant update (full_name, last_seen_at, access) on public.profiles to authenticated;
grant insert, delete on public.teacher_students to authenticated;
grant insert, delete on public.invites to authenticated;
grant insert, update, delete on public.units, public.vocab_items, public.questions, public.legal_documents to authenticated;
grant insert on public.attempts to authenticated;
grant insert, update on public.srs_cards, public.item_mastery, public.unit_progress, public.skill_scores to authenticated;
grant insert, delete on public.unit_unlocks to authenticated;
grant insert, update, delete on public.assignments to authenticated;
grant insert, update on public.subscriptions to authenticated;
grant insert on public.consents to authenticated;
grant insert, delete on public.voice_recordings to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.teacher_students enable row level security;
alter table public.invites enable row level security;
alter table public.units enable row level security;
alter table public.vocab_items enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.srs_cards enable row level security;
alter table public.item_mastery enable row level security;
alter table public.unit_progress enable row level security;
alter table public.unit_unlocks enable row level security;
alter table public.skill_scores enable row level security;
alter table public.assignments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.legal_documents enable row level security;
alter table public.consents enable row level security;
alter table public.voice_recordings enable row level security;
alter table public.notification_log enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_teacher_of(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_teacher_of(id))
  with check (id = auth.uid() or public.is_admin() or public.is_teacher_of(id));

-- vínculos e convites
create policy ts_select on public.teacher_students for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid() or public.is_admin());
create policy ts_insert on public.teacher_students for insert to authenticated
  with check (public.is_admin() or (teacher_id = auth.uid() and public.is_staff()));
create policy ts_delete on public.teacher_students for delete to authenticated
  using (public.is_admin() or teacher_id = auth.uid());
create policy invites_select on public.invites for select to authenticated using (teacher_id = auth.uid() or public.is_admin());
create policy invites_insert on public.invites for insert to authenticated
  with check (public.is_admin() or (teacher_id = auth.uid() and public.is_staff()));
create policy invites_delete on public.invites for delete to authenticated using (teacher_id = auth.uid() or public.is_admin());

-- conteúdo: leitura para quem tem acesso (ou equipe); itens pendentes de revisão só para a equipe; escrita só admin
create policy units_select on public.units for select to authenticated using (public.is_staff() or public.has_active_access(auth.uid()));
create policy vocab_select on public.vocab_items for select to authenticated
  using (public.is_staff() or (public.has_active_access(auth.uid()) and active and not needs_review));
create policy questions_select on public.questions for select to authenticated
  using (public.is_staff() or (public.has_active_access(auth.uid()) and active and not needs_review));
create policy units_write on public.units for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy vocab_write on public.vocab_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy questions_write on public.questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tentativas: o aluno insere as próprias (com acesso ativo) e nunca edita
create policy attempts_select on public.attempts for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy attempts_insert on public.attempts for insert to authenticated
  with check (student_id = auth.uid() and public.has_active_access(auth.uid()));

-- dados derivados: o aluno lê e escreve os próprios; a professora lê os dos vinculados
create policy srs_select on public.srs_cards for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy srs_insert on public.srs_cards for insert to authenticated with check (student_id = auth.uid());
create policy srs_update on public.srs_cards for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy im_select on public.item_mastery for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy im_insert on public.item_mastery for insert to authenticated with check (student_id = auth.uid());
create policy im_update on public.item_mastery for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy up_select on public.unit_progress for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy up_insert on public.unit_progress for insert to authenticated with check (student_id = auth.uid());
create policy up_update on public.unit_progress for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy ss_select on public.skill_scores for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy ss_insert on public.skill_scores for insert to authenticated with check (student_id = auth.uid());
create policy ss_update on public.skill_scores for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

-- liberação manual: só a professora vinculada ou admin escreve; o aluno só lê
create policy uu_select on public.unit_unlocks for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy uu_insert on public.unit_unlocks for insert to authenticated
  with check (public.is_admin() or public.is_teacher_of(student_id));
create policy uu_delete on public.unit_unlocks for delete to authenticated
  using (public.is_admin() or public.is_teacher_of(student_id));

-- tarefas de casa
create policy as_select on public.assignments for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());
create policy as_insert on public.assignments for insert to authenticated
  with check (public.is_admin() or (teacher_id = auth.uid() and public.is_teacher_of(student_id)));
create policy as_update on public.assignments for update to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or teacher_id = auth.uid() or public.is_admin());
create policy as_delete on public.assignments for delete to authenticated using (teacher_id = auth.uid() or public.is_admin());

-- assinaturas: aluno e professora leem; a professora só concede acesso manual; Hotmart entra só pelo servidor (service role)
create policy sub_select on public.subscriptions for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.is_teacher_of(student_id));
create policy sub_insert on public.subscriptions for insert to authenticated
  with check (public.is_admin() or (origin = 'manual' and public.is_teacher_of(student_id)));
create policy sub_update on public.subscriptions for update to authenticated
  using (public.is_admin() or (origin = 'manual' and public.is_teacher_of(student_id)))
  with check (public.is_admin() or (origin = 'manual' and public.is_teacher_of(student_id)));

-- log de webhooks: só admin lê
create policy wh_select on public.webhook_events for select to authenticated using (public.is_admin());

-- LGPD
create policy legal_select on public.legal_documents for select to anon, authenticated using (true);
create policy legal_write on public.legal_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy consents_select on public.consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy consents_insert on public.consents for insert to authenticated with check (user_id = auth.uid());

-- gravações de voz: só o próprio aluno (a professora vê a transcrição nas tentativas, não o áudio)
create policy vr_select on public.voice_recordings for select to authenticated using (student_id = auth.uid());
create policy vr_insert on public.voice_recordings for insert to authenticated
  with check (student_id = auth.uid() and public.has_active_access(auth.uid()));
create policy vr_delete on public.voice_recordings for delete to authenticated using (student_id = auth.uid());

-- notification_log: sem política (só service role)

-- ===== 20260101000003_storage.sql =====
-- Buckets: 'audio' (referência, leitura para autenticados) e 'recordings' (gravações dos alunos, privado).
-- Só roda no Supabase (schema storage). Em outros ambientes é ignorado.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false) on conflict (id) do nothing;

    execute $p$create policy "audio_read" on storage.objects for select to authenticated using (bucket_id = 'audio')$p$;
    execute $p$create policy "recordings_own_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "recordings_own_select" on storage.objects for select to authenticated
      using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "recordings_own_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;

-- ===== 20260101000004_billing.sql =====
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

-- ===== 20260101000005_profile_fk.sql =====
-- Excluir o usuário em auth.users apaga o perfil e, em cascata, todos os dados de estudo (LGPD: exclusão pelo titular).
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;

-- ===== 20260101000006_function_privileges.sql =====
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

-- ===== 20260101000007_remove_hotmart.sql =====
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

-- ===== 20260101000008_concepts.sql =====
-- Cada questão treina um "conceito" (ponto de conteúdo). Questões com o mesmo conceito são variações uma da outra.
-- O sorteio usa isso para reforçar um erro com outra pergunta, em vez de repetir a mesma, e o domínio passa a ser por conceito.
alter table public.questions add column if not exists concept text;
alter table public.attempts add column if not exists concept text;
create index if not exists questions_concept_idx on public.questions (concept);
create index if not exists attempts_student_concept_idx on public.attempts (student_id, concept);

-- ===== 20260101000009_topics.sql =====
-- Assunto de cada questão (viagem, restaurante, compras, trabalho, horário do dia...), para o aluno filtrar a prática.
alter table public.questions add column if not exists topic text not null default 'dia_a_dia';
create index if not exists questions_topic_idx on public.questions (topic) where active;

-- ===== 20260101000010_tracks.sql =====
-- Áreas de leitura, gramática e vocabulário por nível (CEFR), ao lado da trilha do e-book.
-- track: 'trilha' (padrão, treino diário e unidades), 'leitura', 'gramatica' ou 'vocabulario'.
alter table public.questions add column if not exists track text not null default 'trilha';
alter table public.questions add column if not exists cefr text;
alter table public.questions add column if not exists reading_id text;
create index if not exists questions_track_idx on public.questions (track, cefr) where active;
