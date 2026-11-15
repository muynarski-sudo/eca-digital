import { describe, expect, it } from 'vitest';
import { compareSpoken } from '@/lib/speech/compare';
import { audioKey } from '@/lib/audio/key';

describe('compareSpoken (foi compreendido)', () => {
  it('tudo igual, ignorando acento, caixa e pontuação', () => {
    const r = compareSpoken("Où est la gare, s'il vous plaît ?", 'ou est la gare sil vous plait');
    expect(r.verdict).toBe('correct');
    expect(r.ratio).toBe(1);
    expect(r.words.every((w) => w.understood)).toBe(true);
  });
  it('mostra palavra a palavra o que não foi compreendido', () => {
    const r = compareSpoken('Je voudrais un billet pour Paris', 'je voudrais un billet Paris');
    expect(r.words.map((w) => [w.word, w.understood])).toEqual([['Je', true], ['voudrais', true], ['un', true], ['billet', true], ['pour', false], ['Paris', true]]);
    expect(r.ratio).toBeCloseTo(5 / 6, 5);
    expect(r.verdict).toBe('almost');
  });
  it('palavras sobrando entram em "extra" e não punem o resto', () => {
    const r = compareSpoken('Merci beaucoup', 'euh merci beaucoup');
    expect(r.verdict).toBe('correct');
    expect(r.extra).toEqual(['euh']);
  });
  it('elisão com apóstrofo conta como uma palavra', () => {
    const r = compareSpoken("J'ai une réservation", 'j ai une reservation');
    expect(r.verdict).toBe('correct');
  });
  it('transcrição vazia ou sem relação é "não compreendido"', () => {
    expect(compareSpoken('Bonjour', '').verdict).toBe('wrong');
    expect(compareSpoken('Où est la gare', 'xyz abc').ratio).toBe(0);
  });
});

describe('audioKey', () => {
  it('é estável e ignora espaços extras', () => {
    expect(audioKey('Bonjour  monsieur ')).toBe(audioKey('Bonjour monsieur'));
    expect(audioKey('Bonjour')).not.toBe(audioKey('Bonsoir'));
    expect(audioKey('Bonjour')).toMatch(/^[0-9a-f]{20}$/);
  });
});
