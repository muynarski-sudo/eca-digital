import type { Question } from '@/lib/content/schema';

export type Verdict = 'correct' | 'almost' | 'wrong';
export const PARTIAL_CREDIT = 0.5;

export interface GradeResult {
  verdict: Verdict;
  /** Crédito de 0 a 1: certo = 1, quase certo = 0,5, errado = 0. */
  score: number;
  /** Forma correta a mostrar ao aluno. */
  expected: string;
}

const APOSTROPHES = /[’‘ʼ´`]/g;

/** Normaliza para comparar: caixa, espaços, apóstrofos, hífens e pontuação. Mantém os acentos. */
export function normalize(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(/[‐-―-]/g, ' ')
    .replace(/[.,;:!?¿¡"«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

export function gradeText(answer: string, accepted: string[]): GradeResult {
  const official = accepted[0] ?? '';
  const given = normalize(answer);
  if (given === '') return { verdict: 'wrong', score: 0, expected: official };
  for (const a of accepted)
    if (normalize(a) === given) return { verdict: 'correct', score: 1, expected: a };
  const bare = stripAccents(given);
  for (const a of accepted) {
    if (stripAccents(normalize(a)) === bare)
      return { verdict: 'almost', score: PARTIAL_CREDIT, expected: a };
  }
  return { verdict: 'wrong', score: 0, expected: official };
}

export type Response = string | { pairs: Array<{ left: string; right: string }> };

/** Corrige a resposta de qualquer tipo de questão. Função pura. */
export function gradeQuestion(
  q: Pick<Question, 'type' | 'answers' | 'pairs'>,
  response: Response,
): GradeResult {
  if (q.type === 'match_pairs') {
    const expected = q.pairs ?? [];
    const given = typeof response === 'string' ? [] : response.pairs;
    const right = expected.filter((p) =>
      given.some((g) => g.left === p.left && g.right === p.right),
    ).length;
    const score = expected.length === 0 ? 0 : right / expected.length;
    const verdict: Verdict = score === 1 ? 'correct' : score > 0 ? 'almost' : 'wrong';
    return { verdict, score, expected: expected.map((p) => `${p.left} = ${p.right}`).join('; ') };
  }
  const text = typeof response === 'string' ? response : '';
  if (q.type === 'multiple_choice') {
    const ok = text === q.answers[0];
    return { verdict: ok ? 'correct' : 'wrong', score: ok ? 1 : 0, expected: q.answers[0] ?? '' };
  }
  return gradeText(text, q.answers);
}
