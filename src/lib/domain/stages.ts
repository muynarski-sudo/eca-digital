import type { Stage } from '@/lib/content/stages';
import type { Verdict } from './grade';
import type { QuestionMeta, SeenInfo } from './select';

export type StageState = 'locked' | 'open' | 'done';

export interface StageStat {
  total: number;
  answered: number;
  /** pontos: certa = 1, quase certa = 0,5 (pela última resposta de cada questão) */
  points: number;
  /** pontuação de 0 a 100 sobre o total do nível */
  score: number;
  complete: boolean;
}

/** Ditado e fala dependem de áudio e microfone do aparelho: não travam o avanço de nível. */
export const STAGE_SKIP_TYPES = new Set(['dictation', 'speak']);

/** Questões de um nível (sem as de áudio e microfone). */
export const stageList = (questions: QuestionMeta[], stageId: string) =>
  questions.filter((q) => q.stage === stageId && !STAGE_SKIP_TYPES.has(q.type));

const POINTS: Record<Verdict, number> = { correct: 1, almost: 0.5, wrong: 0 };

/** Ordem das questões dentro de um nível: das mais fáceis para as mais difíceis, e dentro de cada dificuldade em ordem fixa (nada de sorteio). */
export function orderStage<T extends Pick<QuestionMeta, 'id' | 'difficulty'>>(list: T[]): T[] {
  return [...list].sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

export function stageStat(list: QuestionMeta[], seen: Map<string, SeenInfo>): StageStat {
  const total = list.length;
  const answered = list.filter((q) => seen.has(q.id)).length;
  const points = list.reduce(
    (s, q) => s + (seen.has(q.id) ? POINTS[seen.get(q.id)!.lastVerdict] : 0),
    0,
  );
  return {
    total,
    answered,
    points,
    score: total === 0 ? 0 : Math.round((points / total) * 100),
    complete: answered >= total,
  };
}

export interface StageView {
  stage: Stage;
  stat: StageStat;
  state: StageState;
  /** número do nível na trilha, a partir de 1 */
  number: number;
}

/**
 * Estado de cada nível. O primeiro está sempre aberto; cada um dos seguintes abre quando o anterior foi concluído
 * (todas as questões respondidas) ou quando a professora liberou o capítulo (unidade) dele.
 */
export function stageViews(
  stages: Stage[],
  questions: QuestionMeta[],
  seen: Map<string, SeenInfo>,
  opts: { unlockedUnits?: Set<string>; openAll?: boolean } = {},
): StageView[] {
  const out: StageView[] = [];
  stages.forEach((stage, i) => {
    const list = stageList(questions, stage.id);
    const stat = stageStat(list, seen);
    const prevDone = i === 0 || out[i - 1]!.stat.complete;
    const open = opts.openAll || prevDone || opts.unlockedUnits?.has(stage.unit);
    const state: StageState = !open ? 'locked' : stat.complete ? 'done' : 'open';
    out.push({ stage, stat, state, number: i + 1 });
  });
  return out;
}

/** Próximas questões ainda não respondidas, na ordem do nível. */
export function nextBatch(list: QuestionMeta[], seen: Map<string, SeenInfo>, size = 10): string[] {
  return orderStage(list)
    .filter((q) => !seen.has(q.id))
    .slice(0, size)
    .map((q) => q.id);
}

/** As que o aluno errou (ou quase acertou) na última vez, na ordem do nível: para refazer. */
export function retryBatch(list: QuestionMeta[], seen: Map<string, SeenInfo>, size = 10): string[] {
  return orderStage(list)
    .filter((q) => seen.has(q.id) && seen.get(q.id)!.lastVerdict !== 'correct')
    .slice(0, size)
    .map((q) => q.id);
}
