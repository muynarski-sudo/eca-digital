-- Assunto de cada questão (viagem, restaurante, compras, trabalho, horário do dia...), para o aluno filtrar a prática.
alter table public.questions add column if not exists topic text not null default 'dia_a_dia';
create index if not exists questions_topic_idx on public.questions (topic) where active;
