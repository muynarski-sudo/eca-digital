import { describe, expect, it } from 'vitest';
import { numberToFrench, timeToFrench } from '@/lib/content/french';

describe('números do e-book', () => {
  it('bate com todos os exemplos do e-book', () => {
    const ebook: Record<number, string> = {
      1: 'un',
      2: 'deux',
      3: 'trois',
      4: 'quatre',
      5: 'cinq',
      6: 'six',
      7: 'sept',
      8: 'huit',
      9: 'neuf',
      10: 'dix',
      11: 'onze',
      12: 'douze',
      13: 'treize',
      14: 'quatorze',
      15: 'quinze',
      16: 'seize',
      17: 'dix-sept',
      18: 'dix-huit',
      19: 'dix-neuf',
      20: 'vingt',
      21: 'vingt et un',
      22: 'vingt-deux',
      23: 'vingt-trois',
      30: 'trente',
      40: 'quarante',
      50: 'cinquante',
      60: 'soixante',
      70: 'soixante-dix',
      71: 'soixante et onze',
      72: 'soixante-douze',
      73: 'soixante-treize',
      81: 'quatre-vingt-un',
      82: 'quatre-vingt-deux',
      90: 'quatre-vingt-dix',
      91: 'quatre-vingt-onze',
      92: 'quatre-vingt-douze',
    };
    for (const [n, w] of Object.entries(ebook)) expect(numberToFrench(Number(n)), n).toBe(w);
  });
  it('regras: et un só até 61, hífen nos demais, 70 a 79 e 80 a 99 compostos', () => {
    expect(numberToFrench(31)).toBe('trente et un');
    expect(numberToFrench(45)).toBe('quarante-cinq');
    expect(numberToFrench(61)).toBe('soixante et un');
    expect(numberToFrench(64)).toBe('soixante-quatre');
    expect(numberToFrench(76)).toBe('soixante-seize');
    expect(numberToFrench(77)).toBe('soixante-dix-sept');
    expect(numberToFrench(85)).toBe('quatre-vingt-cinq');
    expect(numberToFrench(97)).toBe('quatre-vingt-dix-sept');
    expect(numberToFrench(99)).toBe('quatre-vingt-dix-neuf');
  });
  it('fora do escopo devolve null', () => {
    for (const n of [0, 80, 100, -1, 1.5]) expect(numberToFrench(n), String(n)).toBeNull();
  });
  it('todos de 1 a 99 (menos 80) existem e são únicos', () => {
    const all = Array.from({ length: 99 }, (_, i) => numberToFrench(i + 1)).filter(
      (x): x is string => x !== null,
    );
    expect(all).toHaveLength(98);
    expect(new Set(all).size).toBe(98);
  });
});

describe('horas do e-book', () => {
  it('bate com os exemplos e o gabarito do e-book', () => {
    expect(timeToFrench(8, 0)).toBe('huit heures');
    expect(timeToFrench(12, 0)).toBe('midi');
    expect(timeToFrench(0, 0)).toBe('minuit');
    expect(timeToFrench(10, 5)).toBe('dix heures cinq');
    expect(timeToFrench(13, 15)).toBe('une heure et quart');
    expect(timeToFrench(16, 30)).toBe('quatre heures et demie');
    expect(timeToFrench(17, 35)).toBe('six heures moins vingt-cinq');
    expect(timeToFrench(19, 45)).toBe('huit heures moins le quart');
    expect(timeToFrench(21, 55)).toBe('dix heures moins cinq');
    expect(timeToFrench(10, 15)).toBe('dix heures et quart');
    expect(timeToFrench(11, 30)).toBe('onze heures et demie');
    expect(timeToFrench(14, 40)).toBe('trois heures moins vingt');
    expect(timeToFrench(18, 45)).toBe('sept heures moins le quart');
    expect(timeToFrench(8, 50)).toBe('neuf heures moins dix');
  });
  it('usa singular em "une heure" e evita casos que o e-book não cobre', () => {
    expect(timeToFrench(1, 0)).toBe('une heure');
    expect(timeToFrench(13, 0)).toBe('une heure');
    expect(timeToFrench(12, 30)).toBeNull();
    expect(timeToFrench(0, 15)).toBeNull();
    expect(timeToFrench(11, 45)).toBeNull();
    expect(timeToFrench(23, 40)).toBeNull();
    expect(timeToFrench(9, 7)).toBeNull();
    expect(timeToFrench(24, 0)).toBeNull();
  });
});
