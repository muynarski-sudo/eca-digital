/* Seed idempotente do conteúdo no banco. Uso: npm run content:seed [-- --no-overwrite] */
import { loadContent } from '../src/lib/content/load';
import { serviceClient } from './lib/env';
import { validate } from './content-validate';

async function main() {
  const { errors } = validate();
  if (errors.length) {
    console.error(`Conteúdo inválido:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  const noOverwrite = process.argv.includes('--no-overwrite');
  const c = loadContent();
  const db = serviceClient();
  const up = async (table: string, rows: object[], conflict = 'id') => {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db
        .from(table)
        .upsert(rows.slice(i, i + 200), { onConflict: conflict, ignoreDuplicates: noOverwrite });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    console.warn(`${table}: ${rows.length} linhas ${noOverwrite ? '(só novas)' : '(upsert)'}`);
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

  if (!noOverwrite) {
    // itens que saíram dos arquivos ficam inativos (o histórico dos alunos continua íntegro)
    for (const [table, ids] of [
      ['questions', c.questions.map((q) => q.id)],
      ['vocab_items', c.vocab.map((v) => v.id)],
    ] as const) {
      const { data } = await db.from(table).select('id').eq('active', true);
      const gone = (data ?? []).map((r) => r.id as string).filter((id) => !ids.includes(id));
      if (gone.length) {
        await db.from(table).update({ active: false }).in('id', gone);
        console.warn(`${table}: ${gone.length} itens desativados`);
      }
    }
  }
  console.warn('Seed de conteúdo concluído.');
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
