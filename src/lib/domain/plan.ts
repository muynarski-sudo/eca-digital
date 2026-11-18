import { selectLeveled, type Level } from './level';
import type { QuestionMeta, SeenInfo } from './select';
import type { Verdict } from './grade';

export interface PlanInput {
  pool: QuestionMeta[];
  seen: Map<string, SeenInfo>;
  concepts: Map<string, { lastAt: number; lastVerdict: Verdict }>;
  /** unidades abertas (não bloqueadas) */
  openUnits: string[];
  unitMastery: Record<string, number>;
  rng: () => number;
  size?: number;
}

/** Tipos que dependem de áudio ou microfone ficam fora do treino geral. */
const OUT_OF_DAILY = new Set(['dictation', 'speak']);

/**
 * Treino de hoje (~10 minutos): perguntas novas das unidades abertas, com mais chance para a unidade mais fraca
 * e para os conceitos em que o aluno errou por último (com uma pergunta diferente). Nunca repete pergunta já respondida
 * enquanto houver pergunta nova.
 */
export function planDaily(input: PlanInput): {
  ids: string[];
  weakestUnit: string | null;
  level: Level;
} {
  const open = new Set(input.openUnits);
  const weakestUnit = input.openUnits.length
    ? ([...input.openUnits].sort(
        (a, b) => (input.unitMastery[a] ?? 0) - (input.unitMastery[b] ?? 0) || a.localeCompare(b),
      )[0] ?? null)
    : null;
  // conjugações fora de unidade entram com pouco peso, para treinar sem dominar a sessão
  const pool = input.pool.filter(
    (q) => !OUT_OF_DAILY.has(q.type) && (q.unit === null || open.has(q.unit)),
  );
  const { ids, level } = selectLeveled({
    pool,
    seen: input.seen,
    concepts: input.concepts,
    size: input.size ?? 10,
    rng: input.rng,
    weight: (q) => (q.unit === null ? 0.15 : q.unit === weakestUnit ? 3 : 1),
  });
  return { ids, weakestUnit, level };
}

/** Prática de uma unidade: perguntas novas da unidade, do nível do aluno, todos os tipos. */
export function planUnit(input: {
  pool: QuestionMeta[];
  seen: PlanInput['seen'];
  concepts: PlanInput['concepts'];
  unit: string;
  rng: () => number;
  size?: number;
}): string[] {
  return selectLeveled({
    pool: input.pool.filter((q) => q.unit === input.unit),
    seen: input.seen,
    concepts: input.concepts,
    size: input.size ?? 10,
    rng: input.rng,
  }).ids;
}

/**
 * Prática por assunto (viagem, restaurante...): só perguntas das unidades abertas, no nível do aluno naquele assunto.
 * Áudio e microfone ficam de fora, como no treino de hoje.
 */
export function planTopic(input: {
  pool: QuestionMeta[];
  seen: PlanInput['seen'];
  concepts: PlanInput['concepts'];
  topic: string;
  openUnits: string[];
  rng: () => number;
  size?: number;
  /** Força um nível (iniciante, intermediário ou avançado). */
  level?: Level;
}): { ids: string[]; level: Level } {
  const open = new Set(input.openUnits);
  return selectLeveled({
    pool: input.pool.filter(
      (q) =>
        q.topic === input.topic &&
        !OUT_OF_DAILY.has(q.type) &&
        (q.unit === null || open.has(q.unit)),
    ),
    seen: input.seen,
    concepts: input.concepts,
    size: input.size ?? 10,
    rng: input.rng,
    level: input.level,
  });
}
