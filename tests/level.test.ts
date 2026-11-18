import { describe, expect, it } from 'vitest';
import { levelFor, levelMix, selectLeveled } from '@/lib/domain/level';
import type { QuestionMeta, SeenInfo } from '@/lib/domain/select';
import { planTopic } from '@/lib/domain/plan';

const rngFrom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const mkPool = (): QuestionMeta[] =>
  [1, 2, 3].flatMap((d) =>
    Array.from({ length: 30 }, (_, i) => ({
      id: `q${d}-${i}`,
      unit: 'u01',
      type: ['fill_blank', 'multiple_choice', 'translate_pt_fr'][i % 3]!,
      concept: `c${d}-${i}`,
      difficulty: d,
      topic: i % 2 ? 'viagem' : 'restaurante',
    })),
  );
const seenOf = (ids: string[], verdict: 'correct' | 'wrong'): Map<string, SeenInfo> =>
  new Map(ids.map((id) => [id, { count: 1, lastAt: 1, lastVerdict: verdict }]));

describe('nível de dificuldade', () => {
  it('quem nunca respondeu começa no nível 1 e só recebe perguntas fáceis', () => {
    const pool = mkPool();
    const r = selectLeveled({
      pool,
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rngFrom(1),
    });
    expect(r.level).toBe(1);
    expect(r.ids).toHaveLength(10);
    expect(new Set(r.ids.map((id) => pool.find((q) => q.id === id)!.difficulty))).toEqual(
      new Set([1]),
    );
  });
  it('sobe para o nível 2 com 8 respostas e 70% de acerto no nível 1', () => {
    const pool = mkPool();
    const ids = pool
      .filter((q) => q.difficulty === 1)
      .slice(0, 10)
      .map((q) => q.id);
    expect(levelFor(pool, seenOf(ids, 'correct'))).toBe(2);
    expect(levelFor(pool, seenOf(ids, 'wrong'))).toBe(1);
    expect(levelFor(pool, seenOf(ids.slice(0, 5), 'correct'))).toBe(1); // poucas respostas
  });
  it('no nível 2 mistura revisão do 1 e vem em ordem do mais fácil ao mais difícil', () => {
    const pool = mkPool();
    const done = pool
      .filter((q) => q.difficulty === 1)
      .slice(0, 10)
      .map((q) => q.id);
    const r = selectLeveled({
      pool,
      seen: seenOf(done, 'correct'),
      concepts: new Map(),
      size: 10,
      rng: rngFrom(2),
    });
    expect(r.level).toBe(2);
    const diffs = r.ids.map((id) => pool.find((q) => q.id === id)!.difficulty);
    expect(diffs).toEqual([...diffs].sort());
    expect(diffs.filter((d) => d === 2).length).toBe(7);
    expect(diffs.filter((d) => d === 3).length).toBe(0);
  });
  it('nível 3 inclui as três faixas', () => {
    expect(levelMix(3, 10)).toEqual({ 1: 2, 2: 3, 3: 5 });
    expect(levelMix(1, 10)).toEqual({ 1: 10, 2: 0, 3: 0 });
  });
  it('quando o nível 1 acaba, avança mesmo sem 70%', () => {
    const pool = mkPool();
    const all1 = pool.filter((q) => q.difficulty === 1).map((q) => q.id);
    expect(levelFor(pool, seenOf(all1, 'wrong'))).toBe(2);
  });
  it('nunca repete e completa a sessão com a faixa vizinha se uma faixa for curta', () => {
    const pool = mkPool().filter(
      (q) => q.difficulty !== 1 || q.id.endsWith('-0') || q.id.endsWith('-1'),
    );
    const r = selectLeveled({
      pool,
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rngFrom(3),
      level: 2,
    });
    expect(r.ids).toHaveLength(10);
    expect(new Set(r.ids).size).toBe(10);
  });
  it('sessões seguidas não repetem pergunta até esgotar', () => {
    const pool = mkPool();
    const seen = new Map<string, SeenInfo>();
    const all: string[] = [];
    for (let s = 0; s < 6; s++) {
      const { ids } = selectLeveled({
        pool,
        seen,
        concepts: new Map(),
        size: 10,
        rng: rngFrom(10 + s),
      });
      for (const id of ids) {
        expect(all.includes(id), id).toBe(false);
        all.push(id);
        seen.set(id, { count: 1, lastAt: s, lastVerdict: 'correct' });
      }
    }
  });
});

describe('prática por assunto', () => {
  it('só traz o assunto pedido e só de unidades abertas', () => {
    const pool: QuestionMeta[] = [
      ...mkPool(),
      { id: 'x1', unit: 'u09', type: 'fill_blank', concept: 'x1', difficulty: 1, topic: 'viagem' },
    ];
    const { ids } = planTopic({
      pool,
      seen: new Map(),
      concepts: new Map(),
      topic: 'viagem',
      openUnits: ['u01'],
      rng: rngFrom(4),
    });
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const q = pool.find((p) => p.id === id)!;
      expect(q.topic).toBe('viagem');
      expect(q.unit).toBe('u01');
    }
  });
});

describe('sem repetir entre faixas', () => {
  it('não recicla pergunta já feita enquanto houver nova em outra faixa', () => {
    const pool = mkPool();
    // todas as perguntas do nível 1 já foram respondidas, mas há muitas novas nos níveis 2 e 3
    const seen = seenOf(
      pool.filter((q) => q.difficulty === 1).map((q) => q.id),
      'correct',
    );
    for (const level of [1, 2, 3] as const) {
      const r = selectLeveled({
        pool,
        seen,
        concepts: new Map(),
        size: 10,
        rng: rngFrom(7),
        level,
      });
      for (const id of r.ids) expect(seen.has(id), `${level}:${id}`).toBe(false);
    }
  });
});
