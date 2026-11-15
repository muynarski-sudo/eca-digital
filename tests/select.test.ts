import { describe, expect, it } from 'vitest';
import {
  selectQuestions,
  spreadTypes,
  type QuestionMeta,
  type SeenInfo,
} from '@/lib/domain/select';
import { planDaily, planUnit } from '@/lib/domain/plan';
import type { Verdict } from '@/lib/domain/grade';

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
const q = (
  id: string,
  concept: string,
  unit: string | null = 'u01',
  type = 'fill_blank',
): QuestionMeta => ({ id, unit, type, concept, difficulty: 1 });
const pool = (n: number, unit = 'u01') =>
  Array.from({ length: n }, (_, i) =>
    q(
      `${unit}-${i}`,
      `c${unit}-${i}`,
      unit,
      i % 3 === 0 ? 'multiple_choice' : i % 3 === 1 ? 'fill_blank' : 'write_out',
    ),
  );
const seenOf = (ids: string[], verdict: Verdict = 'correct', at = 1000): Map<string, SeenInfo> =>
  new Map(ids.map((id, i) => [id, { count: 1, lastAt: at + i, lastVerdict: verdict }]));

describe('sorteio sem repetição', () => {
  it('devolve a quantidade pedida, sem ids repetidos', () => {
    const ids = selectQuestions({
      pool: pool(50),
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rng(1),
    });
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it('nunca devolve pergunta já respondida enquanto houver nova', () => {
    const all = pool(30);
    const done = all.slice(0, 20).map((x) => x.id);
    for (let seed = 1; seed <= 40; seed++) {
      const ids = selectQuestions({
        pool: all,
        seen: seenOf(done),
        concepts: new Map(),
        size: 10,
        rng: rng(seed),
      });
      expect(
        ids.every((id) => !done.includes(id)),
        `seed ${seed}`,
      ).toBe(true);
      expect(ids).toHaveLength(10);
    }
  });

  it('sessões seguidas percorrem o banco inteiro antes de qualquer repetição', () => {
    const all = pool(95);
    const seen = new Map<string, SeenInfo>();
    const shown: string[] = [];
    for (let s = 0; s < 9; s++) {
      const ids = selectQuestions({
        pool: all,
        seen,
        concepts: new Map(),
        size: 10,
        rng: rng(100 + s),
      });
      for (const id of ids) {
        expect(shown.includes(id), `repetiu ${id} na sessão ${s}`).toBe(false);
        shown.push(id);
        seen.set(id, { count: 1, lastAt: shown.length, lastVerdict: 'correct' });
      }
    }
    expect(shown).toHaveLength(90);
  });

  it('é aleatório: sementes diferentes dão sessões diferentes', () => {
    const all = pool(100);
    const a = selectQuestions({
      pool: all,
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rng(1),
    });
    const b = selectQuestions({
      pool: all,
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rng(2),
    });
    expect(a).not.toEqual(b);
  });

  it('reforça um conceito errado com OUTRA pergunta do mesmo conceito, nunca a mesma', () => {
    // conceito "x" tem 3 variações; a primeira o aluno errou
    const all = [
      q('x1', 'x'),
      q('x2', 'x'),
      q('x3', 'x'),
      ...Array.from({ length: 30 }, (_, i) => q(`o${i}`, `o${i}`)),
    ];
    const seen = seenOf(['x1'], 'wrong');
    const concepts = new Map([['x', { lastAt: 1, lastVerdict: 'wrong' as Verdict }]]);
    for (let seed = 1; seed <= 20; seed++) {
      const ids = selectQuestions({ pool: all, seen, concepts, size: 5, rng: rng(seed) });
      expect(ids).not.toContain('x1');
      expect(ids.some((id) => id === 'x2' || id === 'x3')).toBe(true);
    }
  });

  it('conceitos já acertados ficam por último entre as novas', () => {
    const all = [
      q('a1', 'a'),
      q('a2', 'a'),
      ...Array.from({ length: 12 }, (_, i) => q(`n${i}`, `n${i}`)),
    ];
    const concepts = new Map([['a', { lastAt: 1, lastVerdict: 'correct' as Verdict }]]);
    const ids = selectQuestions({
      pool: all,
      seen: seenOf(['a1']),
      concepts,
      size: 10,
      rng: rng(3),
    });
    expect(ids).not.toContain('a2');
  });

  it('no máximo uma pergunta por conceito na mesma sessão', () => {
    const all = [
      ...Array.from({ length: 5 }, (_, i) => q(`k${i}`, 'k')),
      ...Array.from({ length: 12 }, (_, i) => q(`m${i}`, `m${i}`)),
    ];
    const ids = selectQuestions({
      pool: all,
      seen: new Map(),
      concepts: new Map(),
      size: 10,
      rng: rng(9),
    });
    expect(ids.filter((id) => id.startsWith('k'))).toHaveLength(1);
  });

  it('quando tudo foi respondido, recicla as mais antigas e as que errou, sem travar', () => {
    const all = pool(12);
    const seen = new Map<string, SeenInfo>(
      all.map((x, i) => [
        x.id,
        { count: 1, lastAt: 100 + i, lastVerdict: i === 11 ? 'wrong' : 'correct' },
      ]),
    );
    const ids = selectQuestions({ pool: all, seen, concepts: new Map(), size: 5, rng: rng(5) });
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toContain('u01-11'); // a que ele errou volta primeiro
  });

  it('se o banco for menor que o pedido, devolve o que há', () => {
    expect(
      selectQuestions({
        pool: pool(3),
        seen: new Map(),
        concepts: new Map(),
        size: 10,
        rng: rng(1),
      }),
    ).toHaveLength(3);
    expect(
      selectQuestions({ pool: [], seen: new Map(), concepts: new Map(), size: 10, rng: rng(1) }),
    ).toEqual([]);
  });

  it('respeita ids excluídos e pesos', () => {
    const all = [...pool(40, 'u01'), ...pool(40, 'u02')];
    const counts = { u01: 0, u02: 0 };
    for (let seed = 1; seed <= 60; seed++) {
      const ids = selectQuestions({
        pool: all,
        seen: new Map(),
        concepts: new Map(),
        size: 10,
        rng: rng(seed),
        weight: (x) => (x.unit === 'u02' ? 5 : 1),
        exclude: new Set(['u02-0']),
      });
      expect(ids).not.toContain('u02-0');
      for (const id of ids) counts[id.startsWith('u02') ? 'u02' : 'u01']++;
    }
    expect(counts.u02).toBeGreaterThan(counts.u01 * 2);
  });

  it('não coloca mais de dois tipos iguais em sequência quando há como evitar', () => {
    const list = [
      q('1', 'a', 'u', 't'),
      q('2', 'b', 'u', 't'),
      q('3', 'c', 'u', 't'),
      q('4', 'd', 'u', 'z'),
      q('5', 'e', 'u', 'z'),
    ];
    const out = spreadTypes(list).map((x) => x.type);
    for (let i = 2; i < out.length; i++)
      expect(!(out[i] === out[i - 1] && out[i] === out[i - 2])).toBe(true);
    expect(spreadTypes(list)).toHaveLength(5);
  });
});

describe('planos de estudo', () => {
  const all = [
    ...pool(30, 'u01'),
    ...pool(30, 'u02'),
    ...pool(30, 'u03'),
    q('c1', 'cj1', null, 'conjugate'),
    q('d1', 'd1', 'u01', 'dictation'),
    q('s1', 's1', 'u01', 'speak'),
  ];
  it('treino de hoje: só unidades abertas, sem áudio nem fala, sem repetir', () => {
    const seen = seenOf(['u01-0', 'u01-1', 'u01-2']);
    const { ids, weakestUnit } = planDaily({
      pool: all,
      seen,
      concepts: new Map(),
      openUnits: ['u01', 'u02'],
      unitMastery: { u01: 0.8, u02: 0.2 },
      rng: rng(4),
    });
    expect(weakestUnit).toBe('u02');
    expect(ids).toHaveLength(10);
    expect(ids.some((id) => id.startsWith('u03'))).toBe(false);
    expect(ids).not.toContain('d1');
    expect(ids).not.toContain('s1');
    for (const id of ['u01-0', 'u01-1', 'u01-2']) expect(ids).not.toContain(id);
  });
  it('treino de hoje favorece a unidade mais fraca', () => {
    let weak = 0;
    let other = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { ids } = planDaily({
        pool: all,
        seen: new Map(),
        concepts: new Map(),
        openUnits: ['u01', 'u02'],
        unitMastery: { u01: 0.9, u02: 0.1 },
        rng: rng(seed),
      });
      for (const id of ids) id.startsWith('u02') ? (weak += 1) : (other += 1);
    }
    expect(weak).toBeGreaterThan(other);
  });
  it('prática da unidade usa só a unidade e inclui áudio e fala', () => {
    const ids = planUnit({
      pool: all,
      seen: new Map(),
      concepts: new Map(),
      unit: 'u01',
      rng: rng(2),
      size: 40,
    });
    expect(ids.every((id) => id.startsWith('u01') || id === 'd1' || id === 's1')).toBe(true);
    expect(ids).toContain('d1');
  });
});
