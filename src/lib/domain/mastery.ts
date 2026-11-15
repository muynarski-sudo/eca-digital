/** Domínio de itens, unidades e progresso A1. Todas as constantes ficam aqui para calibrar em um só lugar. */
export const MASTERY = {
  alpha: 0.3,
  /** Dias sem prática antes de começar a decair. */
  graceDays: 7,
  /** Meia-vida do domínio depois do período de carência. */
  halfLifeDays: 30,
  unlockThreshold: 0.7,
  masteredThreshold: 0.9,
  /** Quantos pontos de conteúdo (conceitos) diferentes o aluno precisa praticar numa unidade para o domínio dela poder chegar a 100%. */
  coverageTarget: 30,
} as const;

const DAY = 86_400_000;

/** Domínio efetivo agora, aplicando o decaimento por tempo sem prática. */
export function decayed(mastery: number, lastPracticed: Date | null, now: Date): number {
  if (!lastPracticed) return mastery;
  const days = (now.getTime() - lastPracticed.getTime()) / DAY;
  if (days <= MASTERY.graceDays) return mastery;
  return mastery * Math.pow(0.5, (days - MASTERY.graceDays) / MASTERY.halfLifeDays);
}

/**
 * Média móvel exponencial: novo = antigo + alfa * (resultado - antigo).
 * Na primeira observação (`current` nulo) o domínio começa no próprio resultado, porque as perguntas não se repetem
 * e cada ponto de conteúdo é visto poucas vezes.
 */
export function updateMastery(
  current: number | null,
  lastPracticed: Date | null,
  score: number,
  now: Date,
): number {
  if (current === null) return Math.max(0, Math.min(1, score));
  const base = decayed(current, lastPracticed, now);
  const next = base + MASTERY.alpha * (score - base);
  return Math.max(0, Math.min(1, next));
}

export interface WeightedItem {
  mastery: number;
  weight: number;
}

/** Quantos conceitos praticados bastam para cobrir uma unidade: metade dos conceitos dela, no máximo `coverageTarget`. */
export function coverageFor(conceptsInUnit: number): number {
  return Math.max(1, Math.min(MASTERY.coverageTarget, Math.ceil(conceptsInUnit / 2)));
}

/**
 * Domínio da unidade: média ponderada do domínio dos conceitos já praticados, vezes a cobertura
 * (conceitos praticados / meta, no máximo 1). Quem acerta pouco ou praticou pouco não passa de unidade.
 */
export function unitMastery(
  practiced: WeightedItem[],
  coverageTarget: number = MASTERY.coverageTarget,
): number {
  const total = practiced.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return 0;
  const avg = practiced.reduce((s, i) => s + i.mastery * i.weight, 0) / total;
  return avg * Math.min(1, practiced.length / Math.max(1, coverageTarget));
}

export type UnitState = 'locked' | 'in_progress' | 'mastered';

export interface UnitSnapshot {
  id: string;
  order: number;
  mastery: number;
  manuallyUnlocked?: boolean;
}

/** A unidade 1 sempre abre. As demais abrem com 70% na anterior ou por liberação manual da professora. */
export function unitStates(units: UnitSnapshot[]): Record<string, UnitState> {
  const sorted = [...units].sort((a, b) => a.order - b.order);
  const out: Record<string, UnitState> = {};
  sorted.forEach((u, i) => {
    const prev = sorted[i - 1];
    const open =
      i === 0 ||
      u.manuallyUnlocked === true ||
      (prev !== undefined && prev.mastery >= MASTERY.unlockThreshold);
    out[u.id] = !open
      ? 'locked'
      : u.mastery >= MASTERY.masteredThreshold
        ? 'mastered'
        : 'in_progress';
  });
  return out;
}

/** Progresso do nível: média do domínio das unidades. */
export function levelProgress(units: Array<{ mastery: number }>): number {
  if (units.length === 0) return 0;
  return units.reduce((s, u) => s + u.mastery, 0) / units.length;
}

/** Nível textual por habilidade. */
export function skillLabel(score: number): 'iniciando' | 'em evolução' | 'sólido' {
  return score >= 0.7 ? 'sólido' : score >= 0.4 ? 'em evolução' : 'iniciando';
}

/** Dias consecutivos de estudo. Se hoje ainda não teve prática, a sequência de ontem continua valendo. */
export function studyStreak(days: string[], today: string): number {
  const set = new Set(days);
  const toDate = (d: string) => new Date(`${d}T00:00:00Z`);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let cursor = toDate(today);
  if (!set.has(fmt(cursor))) cursor = new Date(cursor.getTime() - DAY);
  let streak = 0;
  while (set.has(fmt(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
}

/** Data local (yyyy-mm-dd) no fuso de São Paulo. */
export function localDay(d: Date, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
