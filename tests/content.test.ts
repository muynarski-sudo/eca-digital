import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadContent } from '@/lib/content/load';
import { TOPICS } from '@/lib/content/schema';
import { gradeQuestion } from '@/lib/domain/grade';
import { validate } from '../scripts/content-validate';

describe('conteúdo do e-book', () => {
  const { errors, report } = validate();
  const c = loadContent();

  it('passa na validação (zod, referências, REVIEW.md)', () => {
    expect(errors).toEqual([]);
  });
  it('tem 10 unidades, 17 verbos em 5 tempos e cerca de 100 exercícios do e-book', () => {
    expect(c.units).toHaveLength(10);
    expect(c.conjugations).toHaveLength(17);
    const fromEbook = c.questions.filter((q) => q.id.startsWith('q-u'));
    expect(fromEbook.length).toBeGreaterThanOrEqual(95);
    expect(report.totais.questoes).toBe(c.questions.length);
  });
  it('só o alfabeto e o exercício do chirurgien estão pendentes', () => {
    const flagged = [
      ...c.vocab.filter((v) => v.needs_review).map((v) => v.category),
      ...c.questions.filter((q) => q.needs_review).map((q) => q.prompt),
    ];
    expect(new Set(flagged)).toEqual(
      new Set(['alfabeto', 'Coloque no feminino: "Il est un bon chirurgien."']),
    );
  });
  it('nenhum item pendente vira exercício de áudio, cartão ou questão gerada', () => {
    const letters = new Set(c.vocab.filter((v) => v.needs_review).map((v) => v.fr));
    for (const q of c.questions.filter((q) => !q.needs_review && q.type === 'multiple_choice')) {
      expect(letters.has(/"(.+)"/.exec(q.prompt)?.[1] ?? '')).toBe(false);
    }
  });
  it('respostas certas escritas de outro jeito também valem (sem acento, frase inteira, com pronome)', () => {
    const noAccent = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const q of c.questions) {
      if (q.type === 'match_pairs' || q.type === 'multiple_choice' || q.type === 'order_words')
        continue;
      if (q.type === 'speak' || q.type === 'dictation') continue;
      const a = q.answers[0]!;
      expect(gradeQuestion(q, noAccent(a)).verdict, `${q.id} sem acento`).toBe('correct');
      expect(gradeQuestion(q, a.toUpperCase()).verdict, `${q.id} maiúsculas`).toBe('correct');
      if (q.type === 'conjugate') {
        const subj = /:\s([^:]*?)_____$/.exec(q.prompt)?.[1] ?? '';
        expect(gradeQuestion(q, `${subj}${a}`).verdict, `${q.id} com pronome`).toBe('correct');
      }
    }
  });
  it('nenhum exercício usa tempo verbal que o e-book ainda não ensina nos capítulos', () => {
    const outros = c.questions.filter((q) =>
      /^q-conj-.*-(futur-proche|passe-compose|imparfait|futur-simple)-/.test(q.id),
    );
    expect(outros).toEqual([]);
    expect(
      c.questions.filter((q) => /passé composé|imparfait|futur simple/i.test(q.prompt)),
    ).toEqual([]);
  });
  it('toda questão tem assunto e nível, e cada nível tem questões', () => {
    const topics = new Set(c.questions.map((q) => q.topic));
    for (const t of topics) expect(TOPICS as readonly string[]).toContain(t);
    for (const t of ['apresentacao', 'viagem', 'restaurante', 'compras', 'trabalho', 'horario'])
      expect(topics.has(t as never), t).toBe(true);
    expect(new Set(c.questions.map((q) => q.difficulty))).toEqual(new Set([1, 2, 3]));
  });
  it('a recordação ao escrever em francês é mais difícil que reconhecer o significado', () => {
    const d = (prefix: string) =>
      c.questions.filter((q) => q.id.startsWith(prefix)).map((q) => q.difficulty);
    expect(Math.max(...d('q-vfp-'))).toBe(1);
    expect(Math.min(...d('q-vty-'))).toBeGreaterThanOrEqual(2);
    expect(Math.min(...d('q-trp-'))).toBeGreaterThanOrEqual(2);
  });
  it('a resposta oficial de cada questão corrige como certa', () => {
    for (const q of c.questions) {
      if (q.type === 'match_pairs') {
        expect(gradeQuestion(q, { pairs: q.pairs! }).verdict, q.id).toBe('correct');
      } else {
        expect(gradeQuestion(q, q.answers[0]!).verdict, q.id).toBe('correct');
        for (const v of q.answers)
          expect(gradeQuestion(q, v).verdict, `${q.id} variante ${v}`).not.toBe('wrong');
      }
    }
  });
  it('ordenar palavras: as palavras formam exatamente a resposta', () => {
    for (const q of c.questions.filter((q) => q.type === 'order_words')) {
      expect(gradeQuestion(q, q.words!.join(' ')).verdict, q.id).toBe('wrong'); // embaralhadas
      expect(gradeQuestion(q, q.answers[0]!.split(' ').join(' ')).verdict).toBe('correct');
      expect([...q.words!].sort().join('|')).toBe(q.answers[0]!.split(/\s+/).sort().join('|'));
    }
  });
  it('múltipla escolha tem opções únicas e a resposta entre elas', () => {
    for (const q of c.questions.filter((q) => q.type === 'multiple_choice')) {
      expect(new Set(q.choices).size, q.id).toBe(q.choices!.length);
      expect(q.choices).toContain(q.answers[0]);
    }
  });
  it('conjugações conferem com o e-book', () => {
    const etre = c.conjugations.find((x) => x.verb === 'être')!;
    expect(etre.tenses.present.nous).toBe('nous sommes');
    expect(etre.tenses.passe_compose.je).toBe("j'ai été");
    const aller = c.conjugations.find((x) => x.verb === 'aller')!;
    expect(aller.tenses.futur_simple.ils).toBe('ils/elles iront');
    expect(aller.tenses.passe_compose.vous).toBe('vous êtes allés');
  });
});

describe('estrutura multi-nível', () => {
  it('um novo nível entra só com arquivos novos em content/data', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'content-'));
    cpSync('content/data', dir, { recursive: true });
    writeFileSync(
      path.join(dir, 'units.a2.json'),
      JSON.stringify([
        {
          id: 'a2-u01',
          level: 'A2',
          order: 1,
          title: 'Passé composé',
          objective: 'o',
          summary: 's',
        },
      ]),
    );
    writeFileSync(
      path.join(dir, 'questions.a2.json'),
      JSON.stringify([
        {
          id: 'q-a2-001',
          unit: 'a2-u01',
          type: 'fill_blank',
          skill: 'gramatica',
          prompt: 'x',
          answers: ['y'],
          explanation: 'e',
          difficulty: 1,
          source: 'generated',
          needs_review: true,
        },
      ]),
    );
    const c = loadContent(dir);
    expect(c.units.filter((u) => u.level === 'A2')).toHaveLength(1);
    expect(c.units.filter((u) => u.level === 'A1')).toHaveLength(10);
    expect(c.questions.some((q) => q.id === 'q-a2-001')).toBe(true);
  });
});
