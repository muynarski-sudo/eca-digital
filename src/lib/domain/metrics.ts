import { localDay } from './mastery';

export interface AttemptRow {
  studentId: string;
  at: Date;
  verdict: 'correct' | 'almost' | 'wrong';
  score: number;
  unit?: string | null;
  tags?: string[];
}

const DAY = 86_400_000;

/** Alunos ativos na semana: com pelo menos uma tentativa nos últimos 7 dias. */
export function activeThisWeek(attempts: AttemptRow[], now: Date): number {
  const since = now.getTime() - 7 * DAY;
  return new Set(attempts.filter((a) => a.at.getTime() >= since).map((a) => a.studentId)).size;
}

/**
 * Retenção em 30 dias: entre os alunos cuja primeira prática foi há pelo menos 30 dias,
 * a fração que voltou a praticar 30 dias ou mais depois da primeira prática.
 * Devolve null quando ainda não há ninguém na coorte.
 */
export function retention30(attempts: AttemptRow[], now: Date): { rate: number | null; cohort: number; retained: number } {
  const byStudent = new Map<string, Date[]>();
  for (const a of attempts) byStudent.set(a.studentId, [...(byStudent.get(a.studentId) ?? []), a.at]);
  let cohort = 0;
  let retained = 0;
  for (const dates of byStudent.values()) {
    const first = Math.min(...dates.map((d) => d.getTime()));
    if (now.getTime() - first < 30 * DAY) continue;
    cohort++;
    if (dates.some((d) => d.getTime() - first >= 30 * DAY)) retained++;
  }
  return { rate: cohort === 0 ? null : retained / cohort, cohort, retained };
}

export interface UnitDifficulty { unit: string; attempts: number; accuracy: number }

/** Unidades mais difíceis: menor crédito médio, ignorando unidades com poucas tentativas. */
export function hardestUnits(attempts: AttemptRow[], minAttempts = 10, limit = 5): UnitDifficulty[] {
  const map = new Map<string, { n: number; sum: number }>();
  for (const a of attempts) {
    if (!a.unit) continue;
    const e = map.get(a.unit) ?? { n: 0, sum: 0 };
    e.n++;
    e.sum += a.score;
    map.set(a.unit, e);
  }
  return [...map.entries()]
    .filter(([, e]) => e.n >= minAttempts)
    .map(([unit, e]) => ({ unit, attempts: e.n, accuracy: e.sum / e.n }))
    .sort((a, b) => a.accuracy - b.accuracy || a.unit.localeCompare(b.unit))
    .slice(0, limit);
}

export interface WeeklySummary {
  attempts: number;
  daysStudied: number;
  accuracy: number | null;
  topErrorTags: Array<{ tag: string; errors: number }>;
}

/** Resumo semanal de um aluno (últimos 7 dias). */
export function weeklySummary(attempts: AttemptRow[], now: Date): WeeklySummary {
  const since = now.getTime() - 7 * DAY;
  const week = attempts.filter((a) => a.at.getTime() >= since);
  const tags = new Map<string, number>();
  for (const a of week) if (a.verdict !== 'correct') for (const t of a.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1);
  return {
    attempts: week.length,
    daysStudied: new Set(week.map((a) => localDay(a.at))).size,
    accuracy: week.length === 0 ? null : week.reduce((s, a) => s + a.score, 0) / week.length,
    topErrorTags: [...tags.entries()].map(([tag, errors]) => ({ tag, errors })).sort((a, b) => b.errors - a.errors || a.tag.localeCompare(b.tag)).slice(0, 3),
  };
}
