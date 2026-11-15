import type { Verdict } from './grade';

/** SM-2 simplificado. Qualidade de 0 a 5 derivada de acerto e tempo de resposta. */
export interface SrsCard {
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
}

export const SRS_DEFAULTS = { ease: 2.5, minEase: 1.3, fastRatio: 0.6, slowRatio: 2 } as const;

export function newCard(now: Date): SrsCard {
  return { ease: SRS_DEFAULTS.ease, intervalDays: 0, repetitions: 0, dueAt: now };
}

/** Qualidade (0 a 5): errado = 1; quase certo = 3; certo = 5 (rápido), 4 (normal) ou 3 (lento). */
export function qualityFrom(verdict: Verdict, elapsedMs: number, expectedMs = 8000): number {
  if (verdict === 'wrong') return 1;
  if (verdict === 'almost') return 3;
  if (elapsedMs <= expectedMs * SRS_DEFAULTS.fastRatio) return 5;
  if (elapsedMs >= expectedMs * SRS_DEFAULTS.slowRatio) return 3;
  return 4;
}

const DAY = 86_400_000;

export function review(card: SrsCard, quality: number, now: Date): SrsCard {
  const q = Math.max(0, Math.min(5, quality));
  const ease = Math.max(SRS_DEFAULTS.minEase, card.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (q < 3) {
    return { ease, intervalDays: 1, repetitions: 0, dueAt: new Date(now.getTime() + DAY) };
  }
  const repetitions = card.repetitions + 1;
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(1, Math.round(card.intervalDays * ease));
  return { ease, intervalDays, repetitions, dueAt: new Date(now.getTime() + intervalDays * DAY) };
}

export const isDue = (card: Pick<SrsCard, 'dueAt'>, now: Date) => card.dueAt.getTime() <= now.getTime();
