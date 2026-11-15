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
