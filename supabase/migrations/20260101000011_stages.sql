-- Nível da trilha (um assunto só por nível, ver src/lib/content/stages.ts). A ordem e o desbloqueio ficam no app.
alter table public.questions add column if not exists stage text;
create index if not exists questions_stage_idx on public.questions (stage) where active;
