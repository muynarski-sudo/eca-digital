import type { SupabaseClient } from '@supabase/supabase-js';
import { loadContent } from './load';

/** Grava unidades, vocabulário e questões. Idempotente. `noOverwrite` só insere o que falta. */
export async function seedContent(
  db: SupabaseClient,
  opts: { noOverwrite?: boolean; log?: (m: string) => void } = {},
) {
  const log = opts.log ?? (() => undefined);
  const c = loadContent();
  const up = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db
        .from(table)
        .upsert(rows.slice(i, i + 200), { onConflict: 'id', ignoreDuplicates: !!opts.noOverwrite });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    log(`${table}: ${rows.length} linhas ${opts.noOverwrite ? '(só novas)' : '(upsert)'}`);
  };
  await up(
    'units',
    c.units.map((u) => ({
      id: u.id,
      level: u.level,
      ord: u.order,
      chapter: u.chapter ?? null,
      title: u.title,
      objective: u.objective,
      summary: u.summary,
    })),
  );
  await up(
    'vocab_items',
    c.vocab.map((v) => ({
      id: v.id,
      unit_id: v.unit,
      category: v.category,
      fr: v.fr,
      pt: v.pt,
      pron: v.pron ?? null,
      example_fr: v.example?.fr ?? null,
      example_pt: v.example?.pt ?? null,
      source: v.source,
      needs_review: v.needs_review,
      active: true,
    })),
  );
  await up(
    'questions',
    c.questions.map((q) => ({
      id: q.id,
      unit_id: q.unit,
      type: q.type,
      skill: q.skill,
      prompt: q.prompt,
      answers: q.answers,
      choices: q.choices ?? null,
      pairs: q.pairs ?? null,
      words: q.words ?? null,
      audio_text: q.audio_text ?? null,
      hint: q.hint ?? null,
      explanation: q.explanation,
      error_tags: q.error_tags,
      difficulty: q.difficulty,
      source: q.source,
      needs_review: q.needs_review,
      active: true,
    })),
  );
  if (!opts.noOverwrite) {
    for (const [table, ids] of [
      ['questions', c.questions.map((q) => q.id)],
      ['vocab_items', c.vocab.map((v) => v.id)],
    ] as const) {
      const { data } = await db.from(table).select('id').eq('active', true);
      const gone = ((data ?? []) as Array<{ id: string }>)
        .map((r) => r.id)
        .filter((id) => !ids.includes(id));
      if (gone.length) {
        await db.from(table).update({ active: false }).in('id', gone);
        log(`${table}: ${gone.length} itens desativados`);
      }
    }
  }
}
