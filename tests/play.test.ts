import { describe, expect, it } from 'vitest';
import { ALPHABET, exampleWords, headLetter, letterByChar } from '@/lib/play/alphabet';
import {
  listenRound,
  memoryDeck,
  pickUnseen,
  shuffle,
  spellable,
  spellingBank,
} from '@/lib/play/games';
import vocabJson from '../content/data/vocab.json';

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
const vocab = vocabJson.filter(
  (v) => !v.needs_review && v.category !== 'alfabeto' && v.category !== 'numeros',
);

describe('alfabeto', () => {
  it('tem as 26 letras, de A a Z, com nome e pronúncia', () => {
    expect(ALPHABET.map((l) => l.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const l of ALPHABET) {
      expect(l.name.length).toBeGreaterThan(0);
      expect(l.pron.length).toBeGreaterThan(0);
    }
    expect(new Set(ALPHABET.map((l) => l.name)).size).toBe(26);
    expect(letterByChar('w')?.name).toBe('double vé');
  });
  it('as pronúncias que o e-book traz foram mantidas', () => {
    const ebook = Object.fromEntries(
      ALPHABET.filter((l) => l.pronSource === 'ebook').map((l) => [l.letter, l.pron]),
    );
    expect(ebook['H']).toBe('áche');
    expect(ebook['J']).toBe('jí');
    expect(ebook['L']).toBe('éle');
  });
  it('letra inicial ignora artigo, acento e apóstrofo', () => {
    expect(headLetter("l'hôtel")).toBe('H');
    expect(headLetter('le taxi')).toBe('T');
    expect(headLetter('Écouter')).toBe('E');
    expect(headLetter('à gauche')).toBe('A');
    expect(headLetter('…')).toBeNull();
  });
  it('só dá exemplo de palavra que está no e-book e deixa sem exemplo as letras sem palavra', () => {
    const ex = exampleWords(vocab);
    for (const [letter, w] of Object.entries(ex)) {
      expect(
        vocab.some((v) => v.fr === w.fr),
        letter,
      ).toBe(true);
      expect(headLetter(w.fr)).toBe(letter);
    }
    for (const l of ['K', 'W', 'X', 'Y', 'Z']) expect(ex[l]).toBeUndefined();
    expect(Object.keys(ex).length).toBeGreaterThan(15);
  });
});

describe('jogos', () => {
  it('"que letra é essa" devolve 4 letras diferentes com a certa entre elas', () => {
    for (let s = 1; s <= 50; s++) {
      const r = listenRound(rng(s));
      expect(r.options).toHaveLength(4);
      expect(new Set(r.options.map((o) => o.letter)).size).toBe(4);
      expect(r.options.map((o) => o.letter)).toContain(r.target.letter);
    }
  });
  it('não repete a letra recente', () => {
    const avoid = ALPHABET.slice(0, 20).map((l) => l.letter);
    for (let s = 1; s <= 30; s++)
      expect(avoid).not.toContain(listenRound(rng(s), avoid).target.letter);
  });
  it('pickUnseen não repete até esgotar e depois recomeça sem repetir na rodada', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `i${i}` }));
    let seen: string[] = [];
    const shown: string[] = [];
    for (let r = 0; r < 2; r++) {
      const out = pickUnseen(items, seen, (x) => x.id, 5, rng(r + 1));
      seen = out.seen;
      shown.push(...out.picked.map((x) => x.id));
    }
    expect(new Set(shown).size).toBe(10); // 2 rodadas de 5 cobrem os 10
    const next = pickUnseen(items, seen, (x) => x.id, 5, rng(9)); // ciclo novo
    expect(new Set(next.picked.map((x) => x.id)).size).toBe(5);
    const tail = pickUnseen(
      items,
      ['i0', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7'],
      (x) => x.id,
      4,
      rng(3),
    );
    expect(new Set(tail.picked.map((x) => x.id)).size).toBe(4);
    expect(tail.picked.map((x) => x.id)).toEqual(expect.arrayContaining(['i8', 'i9']));
  });
  it('soletrar usa só palavras do e-book de 3 a 8 letras sem acento', () => {
    const w = spellable(vocab);
    expect(w.length).toBeGreaterThan(30);
    for (const x of w) expect(x.fr).toMatch(/^[a-z]{3,8}$/);
    expect(w.some((x) => x.fr === 'merci')).toBe(true);
  });
  it('banco de letras tem todas as letras da palavra e extras que não estão nela', () => {
    for (let s = 1; s <= 30; s++) {
      const bank = spellingBank('merci', rng(s), 3);
      expect(bank).toHaveLength(8);
      const need = 'MERCI'.split('');
      for (const c of need) expect(bank).toContain(c);
      const extras = [...bank];
      for (const c of need) extras.splice(extras.indexOf(c), 1);
      for (const e of extras) expect(need).not.toContain(e);
    }
  });
  it('memória: 6 pares, textos curtos, sem repetir tradução nem palavra', () => {
    const { cards, seen } = memoryDeck(vocab, 6, [], rng(4));
    expect(cards).toHaveLength(12);
    expect(new Set(cards.map((c) => c.text.toLowerCase())).size).toBe(12);
    for (let i = 0; i < 6; i++) expect(cards.filter((c) => c.pair === String(i))).toHaveLength(2);
    expect(seen).toHaveLength(6);
    const again = memoryDeck(vocab, 6, seen, rng(5));
    const firstFr = new Set(cards.filter((c) => c.side === 'fr').map((c) => c.text));
    for (const c of again.cards.filter((c) => c.side === 'fr'))
      expect(firstFr.has(c.text)).toBe(false);
  });
  it('shuffle mantém os itens', () => {
    expect(shuffle([1, 2, 3, 4, 5], rng(7)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
