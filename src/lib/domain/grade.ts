import type { Question } from '@/lib/content/schema';

export type Verdict = 'correct' | 'almost' | 'wrong';
export const PARTIAL_CREDIT = 0.5;

export interface GradeResult {
  verdict: Verdict;
  /** Crédito de 0 a 1: certo = 1, quase certo = 0,5, errado = 0. */
  score: number;
  /** Forma correta a mostrar ao aluno. */
  expected: string;
  /** Aviso opcional em resposta certa (por exemplo, o acento que faltou). */
  note?: string;
}

const APOSTROPHES = /[’‘ʼ´`]/g;

/** Normaliza para comparar: caixa, espaços, apóstrofos, hífens, barras, reticências, ligaduras (œ) e pontuação. Mantém os acentos. */
export function normalize(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(APOSTROPHES, "'")
    .replace(/[‐-―-]/g, ' ')
    .replace(/[.,;:!?¿¡"«»()…/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

/** Distância de edição (Levenshtein) limitada a `max`; devolve max + 1 se passar. */
export function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

export interface TextOptions {
  /** Conjugação: aceita também o pronome sujeito antes do verbo ("je suis", "j'ai"). */
  subject?: boolean;
  /** Frases completas equivalentes (lacuna preenchida), aceitas além das respostas oficiais. */
  extra?: string[];
  /** Hora: aceita "du matin", "de l'après-midi" ou "du soir" no fim. */
  dayPart?: boolean;
  /** Frase longa: um erro de digitação (uma letra) vira "quase certo". */
  fuzzy?: boolean;
}

const SUBJECT =
  /^(?:il elle on|ils elles|il elle|je|tu|il|elle|on|nous|vous|ils|elles)\s+|^j'\s*|^j\s+/;
const DAY_PART = /\s(?:du matin|de l'apres midi|de l'après midi|du soir)$/;

/**
 * Corrige um texto livre. Regras, da mais para a menos exigente:
 * 1. Igual a uma resposta aceita (ignorando caixa, pontuação, apóstrofo, hífen): certo.
 * 2. Igual sem considerar acentos: certo, com aviso do acento (digitar acento no celular é chato e o sentido não muda aqui).
 * 3. Uma letra errada numa frase longa: quase certo.
 */
export function gradeText(answer: string, accepted: string[], opts: TextOptions = {}): GradeResult {
  const official = accepted[0] ?? '';
  const given = normalize(answer);
  if (given === '') return { verdict: 'wrong', score: 0, expected: official };
  const targets = [...accepted, ...(opts.extra ?? [])];
  const forms = new Set<string>([given]);
  if (opts.subject && SUBJECT.test(given)) forms.add(given.replace(SUBJECT, '').trim());
  if (opts.dayPart && DAY_PART.test(given)) forms.add(given.replace(DAY_PART, '').trim());
  forms.delete('');
  for (const a of targets) {
    const na = normalize(a);
    if (forms.has(na))
      return { verdict: 'correct', score: 1, expected: accepted.includes(a) ? a : official };
  }
  const bareForms = [...forms].map(stripAccents);
  for (const a of targets) {
    if (bareForms.includes(stripAccents(normalize(a)))) {
      const shown = accepted.includes(a) ? a : official;
      return {
        verdict: 'correct',
        score: 1,
        expected: shown,
        note: `Certo! Só lembre do acento: ${shown}`,
      };
    }
  }
  if (opts.fuzzy) {
    for (const a of targets) {
      const na = stripAccents(normalize(a));
      if (na.length >= 12 && bareForms.some((g) => editDistance(g, na, 1) <= 1))
        return {
          verdict: 'almost',
          score: PARTIAL_CREDIT,
          expected: accepted.includes(a) ? a : official,
        };
    }
  }
  return { verdict: 'wrong', score: 0, expected: official };
}

/** Frases completas a partir de uma lacuna: "Je ___ Claire. (Eu sou Claire.)" com "suis" vira "Je suis Claire". */
export function filledSentences(prompt: string, answers: string[]): string[] {
  const noHint = prompt.replace(/\s*\([^()]*\)\s*$/, '');
  const blank = /\[?_{2,}\]?/;
  if (!blank.test(noHint)) return [];
  const bases = new Set([noHint]);
  const afterColon = noHint.replace(/^[^:_]{1,60}:\s*/, '');
  bases.add(afterColon);
  const out: string[] = [];
  for (const base of bases)
    for (const a of answers) out.push(base.replace(blank, a).replace(/\s+/g, ' ').trim());
  return out;
}

export type Response = string | { pairs: Array<{ left: string; right: string }> };

/** Corrige a resposta de qualquer tipo de questão. Função pura. */
export function gradeQuestion(
  q: Pick<Question, 'type' | 'answers' | 'pairs'> & { prompt?: string },
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
  return gradeText(text, q.answers, {
    subject:
      q.type === 'conjugate' ||
      (q.type === 'fill_blank' &&
        !!q.prompt &&
        /(?:\b(?:je|tu|il|elle|on|nous|vous|ils|elles)|j')\s*_{2,}/i.test(q.prompt)),
    dayPart: q.type === 'write_out',
    fuzzy: q.type === 'translate_pt_fr' || q.type === 'fill_blank',
    extra: q.type === 'fill_blank' && q.prompt ? filledSentences(q.prompt, q.answers) : undefined,
  });
}
