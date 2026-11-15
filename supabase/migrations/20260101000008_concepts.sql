-- Cada questão treina um "conceito" (ponto de conteúdo). Questões com o mesmo conceito são variações uma da outra.
-- O sorteio usa isso para reforçar um erro com outra pergunta, em vez de repetir a mesma, e o domínio passa a ser por conceito.
alter table public.questions add column if not exists concept text;
alter table public.attempts add column if not exists concept text;
create index if not exists questions_concept_idx on public.questions (concept);
create index if not exists attempts_student_concept_idx on public.attempts (student_id, concept);
