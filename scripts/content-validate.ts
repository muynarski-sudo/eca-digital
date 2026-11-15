import { existsSync, readFileSync } from 'node:fs';
import { loadContent } from '../src/lib/content/load';

export function validate() {
  const errors: string[] = [];
  const c = loadContent();
  const unitIds = new Set(c.units.map((u) => u.id));
  const seen = new Set<string>();
  const uniq = (kind: string, id: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) errors.push(`id duplicado: ${key}`);
    seen.add(key);
  };
  c.units.forEach((u) => uniq('unit', u.id));
  c.vocab.forEach((v) => {
    uniq('vocab', v.id);
    if (!unitIds.has(v.unit)) errors.push(`vocab ${v.id}: unidade ${v.unit} inexistente`);
  });
  c.questions.forEach((q) => {
    uniq('question', q.id);
    if (q.unit && !unitIds.has(q.unit))
      errors.push(`questão ${q.id}: unidade ${q.unit} inexistente`);
  });
  c.dialogues.forEach((d) => {
    uniq('dialogue', d.id);
    if (!unitIds.has(d.unit)) errors.push(`diálogo ${d.id}: unidade inexistente`);
  });
  c.phrases.forEach((p) => {
    uniq('phrase', p.id);
    if (!unitIds.has(p.unit)) errors.push(`frase ${p.id}: unidade inexistente`);
  });
  c.culture.forEach((t) => {
    uniq('culture', t.id);
    if (!unitIds.has(t.unit)) errors.push(`dica ${t.id}: unidade inexistente`);
  });

  // Itens pendentes: precisam estar listados em content/REVIEW.md e não podem alimentar exercícios, flashcards nem áudio.
  const review = existsSync('content/REVIEW.md') ? readFileSync('content/REVIEW.md', 'utf8') : '';
  const flagged = [
    ...c.vocab
      .filter((v) => v.needs_review)
      .map((v) => ({ kind: 'vocab', id: v.id, label: `${v.fr} (${v.category})` })),
    ...c.questions
      .filter((q) => q.needs_review)
      .map((q) => ({ kind: 'questão', id: q.id, label: q.prompt })),
    ...c.phrases
      .filter((p) => p.needs_review)
      .map((p) => ({ kind: 'frase', id: p.id, label: p.fr })),
  ];
  for (const f of flagged)
    if (!review.includes(f.id))
      errors.push(`${f.kind} ${f.id} marcado needs_review mas ausente de content/REVIEW.md`);
  const flaggedFr = new Set(c.vocab.filter((v) => v.needs_review).map((v) => v.fr));
  for (const q of c.questions) {
    if (q.needs_review) continue;
    if (q.type === 'dictation' || q.type === 'speak') {
      if (c.phrases.some((p) => p.needs_review && p.fr === q.audio_text))
        errors.push(`${q.id}: áudio de frase pendente`);
    }
    if (q.type === 'match_pairs' && q.pairs?.some((p) => flaggedFr.has(p.left)))
      errors.push(`${q.id}: usa vocabulário pendente`);
    if (q.type === 'multiple_choice') {
      const fr = /"(.+)"/.exec(q.prompt)?.[1];
      if (fr && c.vocab.some((v) => v.needs_review && v.fr === fr && v.category === 'alfabeto'))
        errors.push(`${q.id}: usa alfabeto pendente`);
    }
  }
  for (const cj of c.conjugations) {
    for (const t of Object.values(cj.tenses))
      for (const f of Object.values(t)) if (!f.trim()) errors.push(`conjugação vazia em ${cj.id}`);
  }

  // Relatório
  const count = <T>(rows: T[], key: (r: T) => string) =>
    rows.reduce<Record<string, number>>((a, r) => ((a[key(r)] = (a[key(r)] ?? 0) + 1), a), {});
  const report = {
    totais: {
      unidades: c.units.length,
      vocabulario: c.vocab.length,
      questoes: c.questions.length,
      conjugacoes: c.conjugations.length,
      dialogos: c.dialogues.length,
      frases: c.phrases.length,
      dicas_culturais: c.culture.length,
    },
    questoes_por_tipo: count(c.questions, (q) => q.type),
    questoes_por_unidade: count(c.questions, (q) => q.unit ?? 'sem unidade (laboratório)'),
    vocabulario_por_unidade: count(c.vocab, (v) => v.unit),
    questoes_por_origem: count(c.questions, (q) => q.source),
    itens_needs_review: flagged.map((f) => `${f.kind} ${f.id}: ${f.label}`),
    questoes_generated: c.questions.filter((q) => q.source === 'generated').map((q) => q.id),
  };
  return { errors, report };
}

const isMain = process.argv[1]?.endsWith('content-validate.ts');
if (isMain) {
  const { errors, report } = validate();
  console.warn(JSON.stringify(report, null, 2));
  if (errors.length) {
    console.error(`\n${errors.length} erro(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.warn('\nConteúdo válido.');
}
