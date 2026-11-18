-- Áreas de leitura, gramática e vocabulário por nível (CEFR), ao lado da trilha do e-book.
-- track: 'trilha' (padrão, treino diário e unidades), 'leitura', 'gramatica' ou 'vocabulario'.
alter table public.questions add column if not exists track text not null default 'trilha';
alter table public.questions add column if not exists cefr text;
alter table public.questions add column if not exists reading_id text;
create index if not exists questions_track_idx on public.questions (track, cefr) where active;
