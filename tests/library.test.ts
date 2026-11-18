import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent } from '@/lib/content/load';
import { CEFR } from '@/lib/content/schema';
import { splitSubject } from '@/lib/content/conjugation';
import { clipKey } from '@/lib/play/clipkey';
import { gradeQuestion } from '@/lib/domain/grade';

const c = loadContent();
const byTrack = (t: string) => c.questions.filter((q) => q.track === t);

describe('leitura por nível', () => {
  it('tem textos em todos os níveis, com 5 perguntas de múltipla escolha cada', () => {
    for (const lv of CEFR)
      expect(c.readings.filter((r) => r.level === lv).length, lv).toBeGreaterThan(0);
    for (const r of c.readings) {
      const qs = byTrack('leitura').filter((q) => q.reading === r.id);
      expect(qs.length, r.id).toBe(5);
      for (const q of qs) {
        expect(q.type).toBe('multiple_choice');
        expect(q.choices).toHaveLength(3);
        expect(new Set(q.choices).size).toBe(3);
        expect(q.choices).toContain(q.answers[0]);
        expect(q.cefr).toBe(r.level);
      }
    }
  });
  it('todo texto tem o arquivo de áudio', () => {
    for (const r of c.readings)
      expect(existsSync(`public/audio/reading/${r.id}.mp3`), r.id).toBe(true);
  });
  it('o A1 usa só o presente (nenhum verbo conjugado em outro tempo no texto)', () => {
    const passado =
      /\b(ai|as|a|avons|avez|ont) (mangé|été|fait|eu|fini|pris|visité|regardé|acheté)\b|\bétais|\bétait|\bserai\b|\bvais (aller|être|manger)\b/i;
    for (const r of c.readings.filter((x) => x.level === 'A1'))
      expect(r.paragraphs.join(' ')).not.toMatch(passado);
  });
  it('o nível mais difícil não é mais curto que o mais fácil', () => {
    const avg = (lv: string) => {
      const l = c.readings.filter((r) => r.level === lv);
      return l.reduce((s, r) => s + r.paragraphs.join(' ').split(/\s+/).length, 0) / l.length;
    };
    expect(avg('A1')).toBeLessThan(avg('B1'));
    expect(avg('B1')).toBeLessThan(avg('C2'));
  });
});

describe('gramática por nível', () => {
  it('vai de A1 a B2 e cada resposta é a forma exata da tabela de conjugações do e-book', () => {
    expect(new Set(byTrack('gramatica').map((q) => q.cefr))).toEqual(
      new Set(['A1', 'A2', 'B1', 'B2']),
    );
    for (const q of byTrack('gramatica')) {
      const verb = /\(([^)]+)\)$/.exec(q.prompt)![1]!;
      const conj = c.conjugations.find((x) => x.verb === verb)!;
      const tense = Object.entries({
        present: 'Présent',
        passe_compose: 'Passé composé',
        futur_proche: 'Futur proche',
        imparfait: 'Imparfait',
        futur_simple: 'Futur simple',
      }).find(([, label]) => q.hint === `Tempo: ${label}`)![0] as keyof typeof conj.tenses;
      const forms = Object.values(conj.tenses[tense]).map((f) => splitSubject(f).form);
      expect(forms, q.id).toContain(q.answers[0]);
    }
  });
  it('A1 só tem presente; A2 passado composto e futuro próximo; B1 imperfeito e futuro simples', () => {
    const tenses = (lv: string) =>
      new Set(
        byTrack('gramatica')
          .filter((q) => q.cefr === lv)
          .map((q) => q.hint),
      );
    expect(tenses('A1')).toEqual(new Set(['Tempo: Présent']));
    expect(tenses('A2')).toEqual(new Set(['Tempo: Passé composé', 'Tempo: Futur proche']));
    expect(tenses('B1')).toEqual(new Set(['Tempo: Imparfait', 'Tempo: Futur simple']));
    expect(tenses('B2').size).toBe(5);
  });
  it('aceita a resposta com o pronome e com a frase inteira', () => {
    const q = byTrack('gramatica').find((x) => x.prompt.startsWith('Hier, nous _____'))!;
    expect(gradeQuestion(q, q.answers[0]!).verdict).toBe('correct');
    expect(gradeQuestion(q, `nous ${q.answers[0]}`).verdict).toBe('correct');
  });
});

describe('vocabulário por nível', () => {
  it('tem palavras em todos os níveis, 4 opções cada, sem palavra repetida', () => {
    for (const lv of CEFR)
      expect(byTrack('vocabulario').filter((q) => q.cefr === lv).length, lv).toBeGreaterThanOrEqual(
        20,
      );
    for (const q of byTrack('vocabulario')) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.audio_text).toBeTruthy();
    }
    const fr = c.lexicon.map((l) => l.fr);
    expect(new Set(fr).size).toBe(fr.length);
  });
  it('toda palavra tem áudio', () => {
    for (const q of byTrack('vocabulario'))
      expect(existsSync(`public/audio/play/${clipKey(q.audio_text!)}.mp3`), q.audio_text).toBe(
        true,
      );
  });
});
