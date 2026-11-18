import { selectQuestions, spreadTypes, type QuestionMeta, type SeenInfo } from './select';
import type { Verdict } from './grade';

export type Level = 1 | 2 | 3;

/** Mínimo de respostas num nível e taxa de acerto para liberar o nível seguinte. */
export const LEVEL_MIN_ANSWERED = 8;
export const LEVEL_PASS_RATE = 0.7;

const done = (v: Verdict) => v === 'correct';

/**
 * Nível atual do aluno num conjunto de questões (todas, de uma unidade ou de um assunto).
 * Começa no 1. Sobe para o 2 quando ele respondeu ao menos 8 do nível 1 e acertou 70% ou mais (na última resposta de cada uma),
 * ou quando já não resta pergunta nova no nível 1. O mesmo vale do 2 para o 3. Níveis sem nenhuma pergunta no conjunto são pulados.
 */
export function levelFor(pool: QuestionMeta[], seen: Map<string, SeenInfo>): Level {
  let level: Level = 1;
  for (const l of [1, 2] as const) {
    const band = pool.filter((q) => q.difficulty === l);
    if (band.length === 0) {
      level = (l + 1) as Level;
      continue;
    }
    const answered = band.filter((q) => seen.has(q.id));
    const right = answered.filter((q) => done(seen.get(q.id)!.lastVerdict)).length;
    const unseen = band.length - answered.length;
    const passed =
      (answered.length >= LEVEL_MIN_ANSWERED && right / answered.length >= LEVEL_PASS_RATE) ||
      unseen === 0;
    if (!passed) break;
    level = (l + 1) as Level;
  }
  return level;
}

/** Quantas perguntas de cada nível entram numa sessão do nível dado (a revisão dos anteriores é minoria). */
export function levelMix(level: Level, size: number): Record<Level, number> {
  if (level === 1) return { 1: size, 2: 0, 3: 0 };
  if (level === 2) {
    const easy = Math.round(size * 0.3);
    return { 1: easy, 2: size - easy, 3: 0 };
  }
  const a = Math.round(size * 0.2);
  const b = Math.round(size * 0.3);
  return { 1: a, 2: b, 3: size - a - b };
}

export interface LeveledInput {
  pool: QuestionMeta[];
  seen: Map<string, SeenInfo>;
  concepts: Map<string, { lastAt: number; lastVerdict: Verdict }>;
  size: number;
  rng: () => number;
  weight?: (q: QuestionMeta) => number;
  /** Força um nível (por exemplo, "só avançado"). Sem isso, usa o nível do aluno. */
  level?: Level;
}

/**
 * Monta uma sessão que segue a dificuldade: do mais fácil para o mais difícil.
 * Cada faixa usa o sorteio sem repetição; se uma faixa não tem perguntas suficientes, a falta vai para a faixa vizinha
 * (primeiro a de cima, depois a de baixo), então a sessão nunca fica menor sem necessidade.
 */
export function selectLeveled(input: LeveledInput): { ids: string[]; level: Level } {
  const level = input.level ?? levelFor(input.pool, input.seen);
  const mix = levelMix(level, input.size);
  const picked = new Map<Level, string[]>([
    [1, []],
    [2, []],
    [3, []],
  ]);
  const used = new Set<string>();
  const usedConcepts = new Set<string>();
  /** Sorteia n perguntas da faixa. `fresh` = só perguntas que o aluno nunca respondeu (nada de reciclar enquanto houver nova em outra faixa). */
  const take = (band: Level, n: number, fresh: boolean) => {
    if (n <= 0) return 0;
    const pool = input.pool.filter(
      (q) =>
        q.difficulty === band &&
        !used.has(q.id) &&
        !usedConcepts.has(q.concept) &&
        (!fresh || !input.seen.has(q.id)),
    );
    const ids = selectQuestions({ ...input, pool, size: n });
    for (const id of ids) {
      used.add(id);
      const q = pool.find((p) => p.id === id);
      if (q) usedConcepts.add(q.concept);
    }
    picked.get(band)!.push(...ids);
    return ids.length;
  };
  let missing = 0;
  for (const band of [1, 2, 3] as const) missing += mix[band] - take(band, mix[band], true);
  // a falta vai para as faixas vizinhas (do nível atual para cima, depois para baixo), ainda só com perguntas novas
  const order: Level[] = [level, 3, 2, 1].filter((l, i, a) => a.indexOf(l) === i) as Level[];
  const fill = (fresh: boolean) => {
    for (const band of order) {
      if (missing <= 0) break;
      missing -= take(band, missing, fresh);
    }
  };
  fill(true);
  // sem pergunta nova suficiente: relaxa "um por conceito" (só com perguntas novas) e, por último, recicla as mais antigas
  if (missing > 0) {
    usedConcepts.clear();
    fill(true);
  }
  if (missing > 0) fill(false);
  const byMeta = new Map(input.pool.map((q) => [q.id, q]));
  const ids = ([1, 2, 3] as const).flatMap((band) =>
    spreadTypes(picked.get(band)!.map((id) => byMeta.get(id)!)).map((q) => q.id),
  );
  return { ids, level };
}
