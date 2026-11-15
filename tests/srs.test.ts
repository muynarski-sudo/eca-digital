import { describe, expect, it } from 'vitest';
import { isDue, newCard, qualityFrom, review } from '@/lib/domain/srs';

const t0 = new Date('2026-01-01T12:00:00Z');
const days = (n: number) => new Date(t0.getTime() + n * 86_400_000);

describe('qualityFrom', () => {
  it('deriva de acerto e tempo', () => {
    expect(qualityFrom('wrong', 1000)).toBe(1);
    expect(qualityFrom('almost', 1000)).toBe(3);
    expect(qualityFrom('correct', 2000)).toBe(5);
    expect(qualityFrom('correct', 8000)).toBe(4);
    expect(qualityFrom('correct', 20000)).toBe(3);
  });
});

describe('review (SM-2 simplificado)', () => {
  it('intervalos crescem 1, 3, depois multiplicam pela facilidade', () => {
    let c = newCard(t0);
    c = review(c, 5, t0);
    expect(c.intervalDays).toBe(1);
    expect(c.dueAt).toEqual(days(1));
    c = review(c, 5, days(1));
    expect(c.intervalDays).toBe(3);
    c = review(c, 5, days(4));
    expect(c.intervalDays).toBe(Math.round(3 * c.ease));
    expect(c.repetitions).toBe(3);
  });
  it('falha zera repetições, volta o intervalo para 1 dia e reduz a facilidade', () => {
    let c = newCard(t0);
    c = review(c, 5, t0);
    c = review(c, 5, days(1));
    const before = c.ease;
    c = review(c, 1, days(4));
    expect(c.repetitions).toBe(0);
    expect(c.intervalDays).toBe(1);
    expect(c.ease).toBeLessThan(before);
  });
  it('facilidade nunca fica abaixo de 1,3', () => {
    let c = newCard(t0);
    for (let i = 0; i < 20; i++) c = review(c, 0, t0);
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });
  it('qualidade 4 mantém a facilidade e 5 aumenta', () => {
    const c = newCard(t0);
    expect(review(c, 4, t0).ease).toBeCloseTo(2.5, 5);
    expect(review(c, 5, t0).ease).toBeCloseTo(2.6, 5);
  });
  it('isDue compara a data', () => {
    const c = review(newCard(t0), 5, t0);
    expect(isDue(c, t0)).toBe(false);
    expect(isDue(c, days(1))).toBe(true);
  });
});
