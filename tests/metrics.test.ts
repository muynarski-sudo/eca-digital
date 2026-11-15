import { describe, expect, it } from 'vitest';
import {
  activeThisWeek,
  hardestUnits,
  retention30,
  weeklySummary,
  type AttemptRow,
} from '@/lib/domain/metrics';

const now = new Date('2026-06-30T12:00:00Z');
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000);
const a = (studentId: string, daysAgo: number, extra: Partial<AttemptRow> = {}): AttemptRow => ({
  studentId,
  at: d(daysAgo),
  verdict: 'correct',
  score: 1,
  ...extra,
});

describe('métricas do painel', () => {
  it('alunos ativos na semana', () => {
    expect(activeThisWeek([a('s1', 1), a('s1', 2), a('s2', 6), a('s3', 8)], now)).toBe(2);
    expect(activeThisWeek([], now)).toBe(0);
  });

  it('retenção em 30 dias considera só quem começou há 30 dias ou mais', () => {
    const attempts = [
      a('s1', 60),
      a('s1', 20), // voltou depois de 30 dias: retido
      a('s2', 50),
      a('s2', 45), // não voltou após 30 dias: não retido
      a('s3', 10),
      a('s3', 1), // ainda fora da coorte
    ];
    expect(retention30(attempts, now)).toEqual({ rate: 0.5, cohort: 2, retained: 1 });
    expect(retention30([a('s3', 5)], now)).toEqual({ rate: null, cohort: 0, retained: 0 });
  });

  it('unidades mais difíceis ignoram unidades com poucas tentativas', () => {
    const rows: AttemptRow[] = [
      ...Array.from({ length: 10 }, (_, i) => a('s1', i, { unit: 'u01', score: 1 })),
      ...Array.from({ length: 10 }, (_, i) =>
        a('s1', i, { unit: 'u03', score: i < 6 ? 0 : 1, verdict: i < 6 ? 'wrong' : 'correct' }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        a('s1', i, { unit: 'u05', score: 0, verdict: 'wrong' }),
      ),
    ];
    const r = hardestUnits(rows);
    expect(r.map((x) => x.unit)).toEqual(['u03', 'u01']);
    expect(r[0]?.accuracy).toBeCloseTo(0.4, 6);
  });

  it('resumo semanal: tentativas, dias, acerto e erros mais comuns', () => {
    const rows: AttemptRow[] = [
      a('s1', 1, { tags: ['horas'] }),
      a('s1', 1, { verdict: 'wrong', score: 0, tags: ['horas', 'numeros'] }),
      a('s1', 3, { verdict: 'wrong', score: 0, tags: ['horas'] }),
      a('s1', 20, { verdict: 'wrong', score: 0, tags: ['antigo'] }),
    ];
    const s = weeklySummary(rows, now);
    expect(s.attempts).toBe(3);
    expect(s.daysStudied).toBe(2);
    expect(s.accuracy).toBeCloseTo(1 / 3, 6);
    expect(s.topErrorTags).toEqual([
      { tag: 'horas', errors: 2 },
      { tag: 'numeros', errors: 1 },
    ]);
    expect(weeklySummary([], now)).toEqual({
      attempts: 0,
      daysStudied: 0,
      accuracy: null,
      topErrorTags: [],
    });
  });
});
