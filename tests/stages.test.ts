import { describe, expect, it } from 'vitest';
import { STAGES } from '@/lib/content/stages';
import { loadContent } from '@/lib/content/load';
import { nextBatch, orderStage, retryBatch, stageStat, stageViews } from '@/lib/domain/stages';
import type { QuestionMeta, SeenInfo } from '@/lib/domain/select';

const c = loadContent();
const metas: QuestionMeta[] = c.questions
  .filter((q) => q.track === 'trilha' && !q.needs_review)
  .map((q) => ({
    id: q.id,
    unit: q.unit,
    type: q.type,
    concept: q.concept ?? q.id,
    difficulty: q.difficulty,
    stage: q.stage,
  }));
const seenAll = (ids: string[], v: 'correct' | 'wrong' = 'correct') =>
  new Map<string, SeenInfo>(ids.map((id) => [id, { count: 1, lastAt: 1, lastVerdict: v }]));

describe('níveis da trilha (um assunto por nível)', () => {
  it('toda questão da trilha tem nível e todo nível tem questões', () => {
    expect(metas.filter((m) => !m.stage)).toEqual([]);
    for (const s of STAGES)
      expect(metas.filter((m) => m.stage === s.id).length, s.id).toBeGreaterThanOrEqual(6);
  });
  it('começa por saudações, despedidas e apresentação, nessa ordem', () => {
    expect(STAGES.slice(0, 3).map((s) => s.id)).toEqual([
      'saudacoes',
      'despedidas',
      'apresentacao',
    ]);
  });
  it('saudações só tem saudações: nada de despedidas, apresentação ou verbos', () => {
    const texts = c.questions
      .filter((q) => q.stage === 'saudacoes')
      .map((q) => q.prompt)
      .join(' | ');
    for (const bad of ['Au revoir', 'À demain', "Je m'appelle", 'Conjugue', 'présent'])
      expect(texts, bad).not.toContain(bad);
    expect(texts).toContain('Bonjour');
  });
  it('despedidas só tem despedidas', () => {
    const texts = c.questions
      .filter((q) => q.stage === 'despedidas')
      .map((q) => q.prompt)
      .join(' | ');
    expect(texts).toContain('Au revoir');
    for (const bad of ['Bonjour', 'Salut', 'Conjugue']) expect(texts, bad).not.toContain(bad);
  });
  it('os níveis de verbo só têm o verbo deles, no presente', () => {
    for (const [stage, verb] of [
      ['verbo-etre', 'être'],
      ['verbo-avoir', 'avoir'],
      ['verbo-faire', 'faire'],
      ['verbo-aller', 'aller'],
    ] as const) {
      for (const q of c.questions.filter((x) => x.stage === stage && x.id.startsWith('q-conj-')))
        expect(q.prompt, q.id).toContain(`Conjugue ${verb}`);
    }
    // tempo verbal nenhum fora dos níveis de verbo
    const verbStages = new Set([
      'verbo-etre',
      'verbo-avoir',
      'verbo-faire',
      'verbo-aller',
      'mais-verbos',
    ]);
    for (const q of c.questions.filter((x) => x.stage && !verbStages.has(x.stage)))
      expect(q.id.startsWith('q-conj-'), q.id).toBe(false);
  });
  it('números e horas são divididos em partes pela dificuldade do próprio número ou minuto', () => {
    const maxNum = (id: string) =>
      Math.max(
        ...c.questions
          .filter((q) => q.stage === id && /^q-num[wd]-/.test(q.id))
          .map((q) => Number(/-(\d+)$/.exec(q.id)![1])),
      );
    expect(maxNum('numeros-1')).toBeLessThanOrEqual(19);
    expect(maxNum('numeros-2')).toBeLessThanOrEqual(49);
    expect(maxNum('numeros-3')).toBeLessThanOrEqual(69);
  });
});

describe('ordem, pontuação e desbloqueio', () => {
  const list = metas.filter((m) => m.stage === 'saudacoes');
  it('as questões vêm em ordem fixa, das fáceis para as difíceis, e nunca embaralhadas', () => {
    const o = orderStage(list);
    expect(o.map((q) => q.difficulty)).toEqual([...o.map((q) => q.difficulty)].sort());
    expect(orderStage([...list].reverse()).map((q) => q.id)).toEqual(o.map((q) => q.id));
  });
  it('só o primeiro nível abre no começo; o próximo abre quando todas as questões do anterior foram respondidas', () => {
    let v = stageViews(STAGES, metas, new Map());
    expect(v.filter((x) => x.state !== 'locked').map((x) => x.stage.id)).toEqual(['saudacoes']);
    const first = metas.filter((m) => m.stage === 'saudacoes').map((m) => m.id);
    v = stageViews(STAGES, metas, seenAll(first.slice(0, -1)));
    expect(v[1]!.state).toBe('locked');
    v = stageViews(STAGES, metas, seenAll(first, 'wrong')); // errou tudo, mas terminou: o próximo abre
    expect(v[0]!.state).toBe('done');
    expect(v[0]!.stat.score).toBe(0);
    expect(v[1]!.state).toBe('open');
    expect(v[2]!.state).toBe('locked');
  });
  it('a professora libera o capítulo inteiro', () => {
    const v = stageViews(STAGES, metas, new Map(), { unlockedUnits: new Set(['u03']) });
    for (const x of v)
      expect(x.state === 'locked', x.stage.id).toBe(
        !(x.stage.unit === 'u03' || x.stage.id === 'saudacoes'),
      );
  });
  it('pontuação: certa vale 1, quase 0,5, errada 0', () => {
    const ids = list.map((q) => q.id);
    const seen = new Map<string, SeenInfo>(
      ids.map((id, i) => [id, { count: 1, lastAt: 1, lastVerdict: i % 2 ? 'wrong' : 'correct' }]),
    );
    const s = stageStat(list, seen);
    expect(s.answered).toBe(list.length);
    expect(s.score).toBe(Math.round((Math.ceil(list.length / 2) / list.length) * 100));
  });
  it('lotes seguem a ordem e pulam o que já foi respondido; refazer traz só as erradas', () => {
    const o = orderStage(list);
    const b1 = nextBatch(list, new Map(), 10);
    expect(b1).toEqual(o.slice(0, 10).map((q) => q.id));
    const seen = seenAll(b1);
    expect(nextBatch(list, seen, 10)).toEqual(o.slice(10, 20).map((q) => q.id));
    const seenWrong = new Map(seen);
    seenWrong.set(b1[2]!, { count: 1, lastAt: 2, lastVerdict: 'wrong' });
    expect(retryBatch(list, seenWrong)).toEqual([b1[2]]);
  });
});
