import { describe, expect, it } from 'vitest';
import { gradeQuestion, gradeText, normalize } from '@/lib/domain/grade';

describe('normalize', () => {
  it('ignora caixa, espaços extras e pontuação', () => {
    expect(normalize('  Je   SUIS  étudiant. ')).toBe('je suis étudiant');
    expect(normalize("Où est la gare, s'il vous plaît ?")).toBe(
      normalize("où est la gare s'il vous plaît"),
    );
  });
  it('unifica apóstrofos', () => {
    expect(normalize('J’ai')).toBe(normalize("J'ai"));
    expect(normalize('l‘école')).toBe(normalize("l'école"));
  });
  it('trata hífen como espaço', () => {
    expect(normalize('vingt-deux')).toBe(normalize('vingt deux'));
  });
});

describe('gradeText', () => {
  const acc = ['Vous avez un chat ?', 'Tu as un chat ?'];
  it('aceita a resposta oficial e variantes', () => {
    expect(gradeText('vous avez un chat', acc)).toMatchObject({ verdict: 'correct', score: 1 });
    expect(gradeText('TU AS UN CHAT?', acc)).toMatchObject({
      verdict: 'correct',
      expected: 'Tu as un chat ?',
    });
  });
  it('só acentos divergindo é "quase certo" com crédito parcial e mostra a forma correta', () => {
    const r = gradeText('etes', ['êtes']);
    expect(r).toEqual({ verdict: 'almost', score: 0.5, expected: 'êtes' });
    expect(gradeText('ca va', ['Ça va'])).toMatchObject({ verdict: 'almost' });
    expect(gradeText('ou', ['Où'])).toMatchObject({ verdict: 'almost' });
  });
  it('acento errado no lugar de outro também é quase certo', () => {
    expect(gradeText('étes', ['êtes']).verdict).toBe('almost');
  });
  it('errado e vazio valem zero e devolvem a forma oficial', () => {
    expect(gradeText('suis', ['êtes'])).toEqual({ verdict: 'wrong', score: 0, expected: 'êtes' });
    expect(gradeText('   ', ['êtes']).verdict).toBe('wrong');
  });
  it('apóstrofo tipográfico não derruba o acerto', () => {
    expect(gradeText('J’ai une réservation', ["J'ai une réservation."]).verdict).toBe('correct');
  });
  it('letra a mais ou a menos é errado', () => {
    expect(gradeText('suiss', ['suis']).verdict).toBe('wrong');
  });
});

describe('gradeQuestion', () => {
  it('múltipla escolha exige a opção exata', () => {
    const q = { type: 'multiple_choice' as const, answers: ['Bom dia'], pairs: undefined };
    expect(gradeQuestion(q, 'Bom dia').verdict).toBe('correct');
    expect(gradeQuestion(q, 'bom dia').verdict).toBe('wrong');
  });
  it('ligar pares dá crédito proporcional', () => {
    const q = {
      type: 'match_pairs' as const,
      answers: [],
      pairs: [
        { left: 'a', right: '1' },
        { left: 'b', right: '2' },
      ],
    };
    expect(
      gradeQuestion(q, {
        pairs: [
          { left: 'a', right: '1' },
          { left: 'b', right: '2' },
        ],
      }),
    ).toMatchObject({ verdict: 'correct', score: 1 });
    expect(
      gradeQuestion(q, {
        pairs: [
          { left: 'a', right: '1' },
          { left: 'b', right: '1' },
        ],
      }),
    ).toMatchObject({ verdict: 'almost', score: 0.5 });
    expect(gradeQuestion(q, { pairs: [] }).verdict).toBe('wrong');
  });
  it('ordenar palavras compara a frase montada', () => {
    const q = {
      type: 'order_words' as const,
      answers: ['Où est la gare?', 'Où est la gare ?'],
      pairs: undefined,
    };
    expect(gradeQuestion(q, 'où est la gare').verdict).toBe('correct');
  });
});
