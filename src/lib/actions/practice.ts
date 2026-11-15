'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { serverClient } from '@/lib/supabase/server';
import { getQuestions } from '@/lib/data/content';
import { gradeQuestion, gradeText } from '@/lib/domain/grade';
import { persistResult } from '@/lib/practice/persist';
import { parseConjugationId } from '@/lib/content/static';
import type { AnswerResult } from '@/lib/practice/types';

const answerSchema = z.object({
  questionId: z.string().min(1).max(80),
  response: z.union([
    z.string().max(500),
    z.object({ pairs: z.array(z.object({ left: z.string(), right: z.string() })).max(12) }),
  ]),
  elapsedMs: z.number().min(0).max(3_600_000),
  assignmentId: z.string().uuid().nullish(),
});

async function currentStudent() {
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error('Sessão expirada. Entre de novo.');
  return { db, uid: data.user.id };
}

/** Corrige no servidor (a resposta nunca vai para o cliente antes) e grava tudo. */
export async function answerQuestion(input: z.infer<typeof answerSchema>): Promise<AnswerResult> {
  const { questionId, response, elapsedMs, assignmentId } = answerSchema.parse(input);
  const { db, uid } = await currentStudent();

  const conj = parseConjugationId(questionId);
  if (conj) {
    const grade = gradeText(typeof response === 'string' ? response : '', [conj.answer]);
    await persistResult(db, {
      studentId: uid,
      itemId: conj.id,
      itemKind: 'conjugation',
      unit: null,
      skill: 'gramatica',
      tags: [`conjugacao_${conj.verb}`],
      grade,
      response: typeof response === 'string' ? response : '',
      elapsedMs,
    });
    return {
      verdict: grade.verdict,
      score: grade.score,
      expected: `${conj.subject}${grade.expected}`,
      explanation: `${conj.verb} (${conj.pt}): ${conj.full}`,
    };
  }

  const [q] = await getQuestions(db, { ids: [questionId] });
  if (!q) throw new Error('Exercício não encontrado.');
  if (q.type === 'speak') throw new Error('Exercícios de fala são enviados pelo gravador.');
  const grade = gradeQuestion(q, response);
  const unitMastery = await persistResult(db, {
    studentId: uid,
    itemId: q.id,
    itemKind: 'question',
    unit: q.unit,
    skill: q.skill,
    tags: q.error_tags,
    grade,
    response: typeof response === 'string' ? response : JSON.stringify(response),
    elapsedMs,
    assignmentId,
  });
  if (assignmentId)
    await db
      .from('assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignmentId)
      .eq('student_id', uid)
      .eq('status', 'assigned');
  return {
    verdict: grade.verdict,
    score: grade.score,
    expected: grade.expected,
    explanation: q.explanation,
    unitMastery,
  };
}

const flashSchema = z.object({
  vocabId: z.string().min(1).max(80),
  quality: z.number().int().min(0).max(5),
  elapsedMs: z.number().min(0).max(600_000).default(0),
});

/** Flashcard: a qualidade vem da autoavaliação do aluno (errei, difícil, bom, fácil). */
export async function reviewFlashcard(input: z.infer<typeof flashSchema>) {
  const { vocabId, quality, elapsedMs } = flashSchema.parse(input);
  const { db, uid } = await currentStudent();
  const { data: v } = await db.from('vocab_items').select('id,unit_id').eq('id', vocabId).single();
  if (!v) throw new Error('Cartão não encontrado.');
  const verdict = quality >= 4 ? 'correct' : quality === 3 ? 'almost' : 'wrong';
  const score = verdict === 'correct' ? 1 : verdict === 'almost' ? 0.5 : 0;
  await persistResult(db, {
    studentId: uid,
    itemId: v.id,
    itemKind: 'vocab',
    unit: v.unit_id,
    skill: 'vocabulario',
    tags: ['vocabulario_cartao'],
    grade: { verdict, score, expected: '' },
    response: `qualidade ${quality}`,
    elapsedMs,
    quality,
    recordAttempt: false,
  });
  return { ok: true };
}

export async function submitAssignment(assignmentId: string) {
  const id = z.string().uuid().parse(assignmentId);
  const { db, uid } = await currentStudent();
  const { error } = await db
    .from('assignments')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('student_id', uid);
  if (error) throw new Error(error.message);
  revalidatePath('/inicio');
  return { ok: true };
}

/** Alternativa em texto para o ditado (acessibilidade): mostra a frase, sem contar nota. */
export async function revealDictationText(questionId: string) {
  const id = z.string().min(1).max(80).parse(questionId);
  const { db } = await currentStudent();
  const [q] = await getQuestions(db, { ids: [id] });
  if (!q || q.type !== 'dictation') throw new Error('Exercício não encontrado.');
  return { text: q.audio_text ?? '' };
}
