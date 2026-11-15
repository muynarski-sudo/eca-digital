import type { Question } from '@/lib/content/schema';
import { decayed } from './mastery';

export interface PlanInput {
  questions: Question[];
  /** domínio salvo por id de questão, com data da última prática */
  itemMastery: Record<string, { mastery: number; lastPracticed: Date | null }>;
  dueQuestionIds: string[];
  unitMastery: Record<string, number>;
  /** unidades abertas (não bloqueadas) */
  openUnits: string[];
  now: Date;
  size?: number;
}

/** Treino de hoje (~10 min): revisões vencidas primeiro, completando com os itens mais fracos da unidade mais fraca aberta. */
export function buildDailyPlan(input: PlanInput): { ids: string[]; weakestUnit: string | null } {
  const size = input.size ?? 10;
  const usable = input.questions.filter((q) => !q.needs_review && q.type !== 'speak' && q.type !== 'dictation');
  const byId = new Map(usable.map((q) => [q.id, q]));
  const ids: string[] = [];
  for (const id of input.dueQuestionIds) {
    if (ids.length >= Math.ceil(size * 0.6)) break;
    if (byId.has(id) && !ids.includes(id)) ids.push(id);
  }
  const open = input.openUnits.length ? input.openUnits : [];
  const weakestUnit = open.length ? [...open].sort((a, b) => (input.unitMastery[a] ?? 0) - (input.unitMastery[b] ?? 0) || a.localeCompare(b))[0] ?? null : null;
  const effective = (id: string) => {
    const m = input.itemMastery[id];
    return m ? decayed(m.mastery, m.lastPracticed, input.now) : 0;
  };
  if (weakestUnit) {
    const pool = usable.filter((q) => q.unit === weakestUnit && !ids.includes(q.id)).sort((a, b) => effective(a.id) - effective(b.id) || a.id.localeCompare(b.id));
    for (const q of pool) {
      if (ids.length >= size) break;
      ids.push(q.id);
    }
  }
  return { ids, weakestUnit };
}
