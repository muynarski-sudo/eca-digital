import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Question } from '@/lib/content/schema';
import type { GradeResult } from '@/lib/domain/grade';
import { newCard, qualityFrom, review, type SrsCard } from '@/lib/domain/srs';
import { coverageFor, unitMastery, updateMastery, decayed } from '@/lib/domain/mastery';

type Skill = Question['skill'];

export interface PersistInput {
  studentId: string;
  itemId: string;
  /** Ponto de conteúdo da questão. O domínio é guardado por conceito. */
  concept?: string;
  itemKind: 'question' | 'vocab' | 'conjugation';
  unit: string | null;
  skill: Skill;
  tags: string[];
  grade: GradeResult;
  response: string;
  elapsedMs: number;
  assignmentId?: string | null;
  /** quando já há qualidade escolhida pelo aluno (flashcards) */
  quality?: number;
  recordAttempt?: boolean;
  now?: Date;
}

/** Grava a tentativa e atualiza SRS, domínio do item, domínio da unidade e nota da habilidade. Devolve o domínio da unidade. */
export async function persistResult(
  db: SupabaseClient,
  p: PersistInput,
): Promise<number | undefined> {
  const now = p.now ?? new Date();
  const iso = now.toISOString();

  if (p.recordAttempt !== false) {
    const { error } = await db.from('attempts').insert({
      student_id: p.studentId,
      question_id: p.itemId,
      concept: p.concept ?? p.itemId,
      correct: p.grade.verdict === 'correct',
      verdict: p.grade.verdict,
      score: p.grade.score,
      response: p.response.slice(0, 500),
      elapsed_ms: Math.round(p.elapsedMs),
      error_tags: p.tags,
      assignment_id: p.assignmentId ?? null,
      created_at: iso,
    });
    if (error) throw new Error(`attempts: ${error.message}`);
  }

  // SRS
  const { data: cardRow } = await db
    .from('srs_cards')
    .select('*')
    .eq('student_id', p.studentId)
    .eq('item_id', p.itemId)
    .maybeSingle();
  const card: SrsCard = cardRow
    ? {
        ease: Number(cardRow.ease),
        intervalDays: cardRow.interval_days,
        repetitions: cardRow.repetitions,
        dueAt: new Date(cardRow.due_at),
      }
    : newCard(now);
  const next = review(card, p.quality ?? qualityFrom(p.grade.verdict, p.elapsedMs), now);
  await db.from('srs_cards').upsert({
    student_id: p.studentId,
    item_id: p.itemId,
    item_kind: p.itemKind,
    ease: next.ease,
    interval_days: next.intervalDays,
    repetitions: next.repetitions,
    due_at: next.dueAt.toISOString(),
    last_reviewed_at: iso,
  });

  // domínio do conceito (variações da mesma pergunta compartilham o domínio)
  const key = p.concept ?? p.itemId;
  const { data: im } = await db
    .from('item_mastery')
    .select('mastery,last_practiced_at')
    .eq('student_id', p.studentId)
    .eq('item_id', key)
    .maybeSingle();
  const newMastery = updateMastery(
    im ? Number(im.mastery) : null,
    im?.last_practiced_at ? new Date(im.last_practiced_at) : null,
    p.grade.score,
    now,
  );
  await db.from('item_mastery').upsert({
    student_id: p.studentId,
    item_id: key,
    mastery: newMastery,
    last_practiced_at: iso,
  });

  // habilidade (média móvel do crédito das tentativas)
  const { data: sk } = await db
    .from('skill_scores')
    .select('score')
    .eq('student_id', p.studentId)
    .eq('skill', p.skill)
    .maybeSingle();
  await db.from('skill_scores').upsert({
    student_id: p.studentId,
    skill: p.skill,
    score: updateMastery(sk ? Number(sk.score) : null, null, p.grade.score, now),
    updated_at: iso,
  });

  // domínio da unidade
  if (!p.unit || p.itemKind !== 'question') return undefined;
  const value = await computeUnitMastery(db, p.studentId, p.unit, now);
  await db
    .from('unit_progress')
    .upsert({ student_id: p.studentId, unit_id: p.unit, mastery: value, updated_at: iso });
  return value;
}

/** Domínio da unidade: conceitos praticados (com decaimento) vezes a cobertura. */
export async function computeUnitMastery(
  db: SupabaseClient,
  studentId: string,
  unit: string,
  now = new Date(),
): Promise<number> {
  const { data: qs } = await db
    .from('questions')
    .select('concept,difficulty')
    .eq('unit_id', unit)
    .eq('active', true)
    .eq('needs_review', false);
  const weight = new Map<string, number>();
  for (const q of (qs ?? []) as Array<{ concept: string | null; difficulty: number }>) {
    if (q.concept && !weight.has(q.concept)) weight.set(q.concept, q.difficulty);
  }
  if (weight.size === 0) return 0;
  const { data: ms } = await db
    .from('item_mastery')
    .select('item_id,mastery,last_practiced_at')
    .eq('student_id', studentId)
    .in('item_id', [...weight.keys()]);
  const practiced = (
    (ms ?? []) as Array<{ item_id: string; mastery: number; last_practiced_at: string | null }>
  ).map((m) => ({
    weight: weight.get(m.item_id) ?? 1,
    mastery: decayed(
      Number(m.mastery),
      m.last_practiced_at ? new Date(m.last_practiced_at) : null,
      now,
    ),
  }));
  return unitMastery(practiced, coverageFor(weight.size));
}
