import { describe, expect, it } from 'vitest';
import { MASTERY, decayed, levelProgress, localDay, skillLabel, studyStreak, unitMastery, unitStates, updateMastery } from '@/lib/domain/mastery';
import { buildDailyPlan } from '@/lib/domain/plan';
import type { Question } from '@/lib/content/schema';

const now = new Date('2026-03-01T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('domínio do item (EMA alfa 0,3)', () => {
  it('aplica a média móvel exponencial', () => {
    expect(updateMastery(0, null, 1, now)).toBeCloseTo(0.3, 6);
    expect(updateMastery(0.3, daysAgo(1), 1, now)).toBeCloseTo(0.3 + 0.3 * 0.7, 6);
    expect(updateMastery(1, daysAgo(1), 0, now)).toBeCloseTo(0.7, 6);
    expect(updateMastery(0.5, daysAgo(1), 0.5, now)).toBeCloseTo(0.5, 6);
  });
  it('converge para 1 com acertos seguidos e fica entre 0 e 1', () => {
    let m = 0;
    for (let i = 0; i < 30; i++) m = updateMastery(m, now, 1, now);
    expect(m).toBeGreaterThan(0.999);
    expect(m).toBeLessThanOrEqual(1);
  });
  it('decai sem prática, depois da carência', () => {
    expect(decayed(0.8, daysAgo(MASTERY.graceDays), now)).toBe(0.8);
    expect(decayed(0.8, daysAgo(MASTERY.graceDays + MASTERY.halfLifeDays), now)).toBeCloseTo(0.4, 6);
    expect(decayed(0.8, null, now)).toBe(0.8);
  });
  it('o decaimento entra antes da atualização', () => {
    const m = updateMastery(0.8, daysAgo(MASTERY.graceDays + MASTERY.halfLifeDays), 1, now);
    expect(m).toBeCloseTo(0.4 + 0.3 * 0.6, 6);
  });
});

describe('unidade e nível', () => {
  it('média ponderada com itens não praticados valendo 0', () => {
    expect(unitMastery([{ mastery: 1, weight: 1 }, { mastery: 0, weight: 3 }])).toBeCloseTo(0.25, 6);
    expect(unitMastery([])).toBe(0);
  });
  it('a unidade seguinte abre com 70% na anterior, ou liberação manual', () => {
    const s = unitStates([
      { id: 'a', order: 1, mastery: 0.7 },
      { id: 'b', order: 2, mastery: 0.5 },
      { id: 'c', order: 3, mastery: 0 },
      { id: 'd', order: 4, mastery: 0, manuallyUnlocked: true },
    ]);
    expect(s).toEqual({ a: 'in_progress', b: 'in_progress', c: 'locked', d: 'in_progress' });
    expect(unitStates([{ id: 'a', order: 1, mastery: 0.69 }, { id: 'b', order: 2, mastery: 0 }]).b).toBe('locked');
    expect(unitStates([{ id: 'a', order: 1, mastery: 0.95 }]).a).toBe('mastered');
  });
  it('progresso A1 é a média das unidades', () => {
    expect(levelProgress([{ mastery: 1 }, { mastery: 0.5 }, { mastery: 0 }])).toBeCloseTo(0.5, 6);
    expect(levelProgress([])).toBe(0);
  });
  it('rótulo por habilidade', () => {
    expect([skillLabel(0.1), skillLabel(0.5), skillLabel(0.9)]).toEqual(['iniciando', 'em evolução', 'sólido']);
  });
});

describe('sequência de dias', () => {
  it('conta dias consecutivos terminando hoje ou ontem', () => {
    expect(studyStreak(['2026-03-01', '2026-02-28', '2026-02-27'], '2026-03-01')).toBe(3);
    expect(studyStreak(['2026-02-28', '2026-02-27'], '2026-03-01')).toBe(2);
    expect(studyStreak(['2026-02-27'], '2026-03-01')).toBe(0);
    expect(studyStreak(['2026-03-01', '2026-02-27'], '2026-03-01')).toBe(1);
    expect(studyStreak([], '2026-03-01')).toBe(0);
  });
  it('localDay usa o fuso de São Paulo', () => {
    expect(localDay(new Date('2026-03-01T02:30:00Z'))).toBe('2026-02-28');
  });
});

describe('treino de hoje', () => {
  const q = (id: string, unit: string, extra: Partial<Question> = {}): Question => ({
    id, unit, type: 'fill_blank', skill: 'gramatica', prompt: 'x', answers: ['x'], explanation: 'x', error_tags: [], difficulty: 1, source: 'ebook', needs_review: false, ...extra,
  });
  const questions = [q('a1', 'u01'), q('a2', 'u01'), q('b1', 'u02'), q('b2', 'u02'), q('b3', 'u02', { needs_review: true }), q('b4', 'u02', { type: 'speak', audio_text: 'x' })];
  it('prioriza revisões vencidas e completa com a unidade mais fraca, sem itens pendentes nem de áudio', () => {
    const plan = buildDailyPlan({
      questions, now, size: 4, dueQuestionIds: ['a2'], openUnits: ['u01', 'u02'], unitMastery: { u01: 0.8, u02: 0.2 },
      itemMastery: { b1: { mastery: 0.9, lastPracticed: now } },
    });
    expect(plan.weakestUnit).toBe('u02');
    expect(plan.ids).toEqual(['a2', 'b2', 'b1']);
  });
  it('sem unidades abertas devolve só as revisões', () => {
    expect(buildDailyPlan({ questions, now, dueQuestionIds: ['a1'], openUnits: [], unitMastery: {}, itemMastery: {} }).ids).toEqual(['a1']);
  });
});
