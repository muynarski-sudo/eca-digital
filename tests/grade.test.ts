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
  it('sem acento (ou com acento trocado) vale certo, com aviso do acento', () => {
    const r = gradeText('etes', ['êtes']);
    expect(r).toMatchObject({ verdict: 'correct', score: 1, expected: 'êtes' });
    expect(r.note).toContain('êtes');
    expect(gradeText('ca va', ['Ça va'])).toMatchObject({ verdict: 'correct', score: 1 });
    expect(gradeText('ou', ['Où'])).toMatchObject({ verdict: 'correct', score: 1 });
    expect(gradeText('étes', ['êtes']).verdict).toBe('correct');
  });
  it('œ pode ser digitado como oe', () => {
    expect(gradeText('soeur', ['sœur']).verdict).toBe('correct');
    expect(gradeText('coeur', ['cœur']).verdict).toBe('correct');
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

describe('tolerância da correção', () => {
  it('conjugação aceita o verbo sozinho ou com o pronome', () => {
    const q = { type: 'conjugate' as const, answers: ['suis'], pairs: undefined };
    for (const r of ['suis', 'je suis', 'Je suis', 'je suis.'])
      expect(gradeQuestion(q, r).verdict, r).toBe('correct');
    const a = { type: 'conjugate' as const, answers: ['ai'], pairs: undefined };
    for (const r of ['ai', "j'ai", 'J’ai', 'j ai'])
      expect(gradeQuestion(a, r).verdict, r).toBe('correct');
    const il = { type: 'conjugate' as const, answers: ['mange'], pairs: undefined };
    for (const r of ['il mange', 'elle mange', 'on mange', 'il/elle/on mange'])
      expect(gradeQuestion(il, r).verdict, r).toBe('correct');
    expect(gradeQuestion(q, 'tu es').verdict).toBe('wrong');
  });
  it('lacuna aceita a frase inteira', () => {
    const q = {
      type: 'fill_blank' as const,
      prompt: 'Bonjour, je _______ Claire. (Bom dia, eu sou Claire.)',
      answers: ['suis'],
      pairs: undefined,
    };
    for (const r of ['suis', 'Bonjour, je suis Claire.', 'bonjour je suis claire'])
      expect(gradeQuestion(q, r).verdict, r).toBe('correct');
    const c = {
      type: 'fill_blank' as const,
      prompt: 'Complete a frase: _______, comment ça va ? (Bom dia, como você está?)',
      answers: ['Bonjour'],
      pairs: undefined,
    };
    expect(gradeQuestion(c, 'Bonjour, comment ça va ?').verdict).toBe('correct');
    expect(gradeQuestion(c, 'Salut, comment ça va ?').verdict).toBe('wrong');
  });
  it('hora aceita "du matin", "de l’après-midi" e "du soir"', () => {
    const q = {
      type: 'write_out' as const,
      answers: ['huit heures', 'Il est huit heures'],
      pairs: undefined,
    };
    for (const r of [
      'huit heures',
      'Il est huit heures',
      'huit heures du matin',
      'Il est huit heures du soir',
    ])
      expect(gradeQuestion(q, r).verdict, r).toBe('correct');
    const t = { type: 'write_out' as const, answers: ['six heures'], pairs: undefined };
    expect(gradeQuestion(t, "six heures de l'après-midi").verdict).toBe('correct');
    expect(gradeQuestion(t, "six heures de l'apres-midi").verdict).toBe('correct');
  });
  it('uma letra errada em frase longa é quase certo; em palavra curta continua errado', () => {
    const q = {
      type: 'translate_pt_fr' as const,
      answers: ['Je voudrais un billet pour Paris.'],
      pairs: undefined,
    };
    expect(gradeQuestion(q, 'Je voudrais un bilet pour Paris').verdict).toBe('almost');
    expect(gradeQuestion(q, 'Je voudrais un taxi pour Paris').verdict).toBe('wrong');
    const w = { type: 'translate_pt_fr' as const, answers: ['Bonjour'], pairs: undefined };
    expect(gradeQuestion(w, 'Bonjor').verdict).toBe('wrong');
  });
  it('reticências, barra e ligadura não derrubam o acerto', () => {
    expect(gradeText('ou est', ['Où est… ?']).verdict).toBe('correct');
    expect(gradeText('mon', ['mon / ma / mes'], {}).verdict).toBe('wrong');
  });
});
