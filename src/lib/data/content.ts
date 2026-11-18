import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Question, Unit, VocabItem } from '@/lib/content/schema';
import type { QuestionMeta } from '@/lib/domain/select';

type Row = Record<string, unknown>;

export const mapUnit = (r: Row): Unit => ({
  id: r.id as string,
  level: r.level as string,
  order: r.ord as number,
  chapter: (r.chapter as number | null) ?? undefined,
  title: r.title as string,
  objective: r.objective as string,
  summary: r.summary as string,
});

export const mapQuestion = (r: Row): Question => ({
  id: r.id as string,
  unit: (r.unit_id as string | null) ?? null,
  type: r.type as Question['type'],
  skill: r.skill as Question['skill'],
  prompt: r.prompt as string,
  answers: (r.answers as string[]) ?? [],
  choices: (r.choices as string[] | null) ?? undefined,
  pairs: (r.pairs as Question['pairs'] | null) ?? undefined,
  words: (r.words as string[] | null) ?? undefined,
  audio_text: (r.audio_text as string | null) ?? undefined,
  concept: (r.concept as string | null) ?? undefined,
  hint: (r.hint as string | null) ?? undefined,
  explanation: r.explanation as string,
  error_tags: (r.error_tags as string[]) ?? [],
  difficulty: r.difficulty as number,
  topic: ((r.topic as string | null) ?? 'dia_a_dia') as Question['topic'],
  track: ((r.track as string | null) ?? 'trilha') as Question['track'],
  stage: (r.stage as string | null) ?? undefined,
  cefr: ((r.cefr as string | null) ?? undefined) as Question['cefr'],
  reading: (r.reading_id as string | null) ?? undefined,
  source: r.source as Question['source'],
  needs_review: r.needs_review as boolean,
});

export const mapVocab = (r: Row): VocabItem => ({
  id: r.id as string,
  unit: r.unit_id as string,
  category: r.category as string,
  fr: r.fr as string,
  pt: r.pt as string,
  pron: (r.pron as string | null) ?? undefined,
  example: r.example_fr
    ? { fr: r.example_fr as string, pt: (r.example_pt as string) ?? '' }
    : undefined,
  source: r.source as VocabItem['source'],
  needs_review: r.needs_review as boolean,
});

export async function getUnits(db: SupabaseClient, level?: string): Promise<Unit[]> {
  let q = db.from('units').select('*').order('ord');
  if (level) q = q.eq('level', level);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUnit);
}

export async function getQuestions(
  db: SupabaseClient,
  opts: { unit?: string; ids?: string[] } = {},
): Promise<Question[]> {
  let q = db.from('questions').select('*').eq('active', true).order('id');
  if (opts.unit) q = q.eq('unit_id', opts.unit);
  if (opts.ids) q = q.in('id', opts.ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuestion).filter((x) => !x.needs_review);
}

export async function getVocab(
  db: SupabaseClient,
  opts: { unit?: string; ids?: string[] } = {},
): Promise<VocabItem[]> {
  let q = db.from('vocab_items').select('*').eq('active', true).order('id');
  if (opts.unit) q = q.eq('unit_id', opts.unit);
  if (opts.ids) q = q.in('id', opts.ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapVocab).filter((x) => !x.needs_review);
}

/** Dados leves de todas as questões liberadas (com paginação, para não esbarrar no limite de linhas da API). */
export async function getQuestionMeta(
  db: SupabaseClient,
  opts: { unit?: string } = {},
): Promise<QuestionMeta[]> {
  const out: QuestionMeta[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from('questions')
      .select('id,unit_id,type,concept,difficulty,topic,stage')
      .eq('active', true)
      .eq('needs_review', false)
      .eq('track', 'trilha')
      .order('id')
      .range(from, from + PAGE - 1);
    if (opts.unit) q = q.eq('unit_id', opts.unit);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      unit_id: string | null;
      type: string;
      concept: string | null;
      difficulty: number;
      topic: string | null;
      stage: string | null;
    }>;
    for (const r of rows)
      out.push({
        id: r.id,
        unit: r.unit_id,
        type: r.type,
        concept: r.concept ?? r.id,
        difficulty: r.difficulty,
        topic: r.topic ?? 'dia_a_dia',
        stage: r.stage ?? undefined,
      });
    if (rows.length < PAGE) break;
  }
  return out;
}

export interface LibraryMeta {
  id: string;
  type: string;
  concept: string;
  difficulty: number;
  cefr: string;
  reading: string | null;
}

/** Dados leves das questões de uma área (leitura, gramática ou vocabulário), opcionalmente de um nível. */
export async function getLibraryMeta(
  db: SupabaseClient,
  track: 'leitura' | 'gramatica' | 'vocabulario',
  cefr?: string,
): Promise<LibraryMeta[]> {
  const out: LibraryMeta[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from('questions')
      .select('id,type,concept,difficulty,cefr,reading_id')
      .eq('active', true)
      .eq('needs_review', false)
      .eq('track', track)
      .order('id')
      .range(from, from + PAGE - 1);
    if (cefr) q = q.eq('cefr', cefr);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      type: string;
      concept: string | null;
      difficulty: number;
      cefr: string | null;
      reading_id: string | null;
    }>;
    for (const r of rows)
      out.push({
        id: r.id,
        type: r.type,
        concept: r.concept ?? r.id,
        difficulty: r.difficulty,
        cefr: r.cefr ?? '',
        reading: r.reading_id,
      });
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Perguntas de um texto de leitura, na ordem. */
export async function getQuestionsOfReading(
  db: SupabaseClient,
  readingId: string,
): Promise<Question[]> {
  const { data, error } = await db
    .from('questions')
    .select('*')
    .eq('active', true)
    .eq('reading_id', readingId)
    .order('id');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapQuestion).filter((x) => !x.needs_review);
}
