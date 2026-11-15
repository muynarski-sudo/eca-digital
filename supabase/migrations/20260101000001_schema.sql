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
