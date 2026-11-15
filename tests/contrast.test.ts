import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '@/lib/a11y/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const tok = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token ausente: ${name}`);
  return m[1]!;
};

// [texto, fundo, mínimo]: 4.5 texto normal, 3 para texto grande / componentes de UI
const pairs: Array<[string, string, number]> = [
  ['white', 'brand-blue', 4.5], // botão primário (texto branco)
  ['brand-blue', 'white', 4.5], // links
  ['brand-blue', 'blue-tint', 4.5],
  ['brand-blue-dark', 'white', 4.5],
  ['brand-blue-dark', 'blue-tint', 4.5],
  ['white', 'brand-blue-dark', 4.5], // rodapé
  ['gray-900', 'white', 4.5],
  ['gray-600', 'white', 4.5],
  ['gray-500', 'white', 4.5], // pronúncia/texto secundário
  ['gray-500', 'blue-tint', 4.5],
  ['gray-500', 'gray-100', 4.5],
  ['brand-red-text', 'white', 4.5],
  ['brand-red-text', 'error-bg', 4.5],
  ['success-text', 'white', 4.5],
  ['success-text', 'success-bg', 4.5],
  ['brand-red', 'white', 3], // só decorativo/ícone grande, nunca texto pequeno
  ['success', 'white', 3],
  ['brand-blue', 'gray-200', 3], // foco/bordas de componentes
];

describe('contraste AA dos tokens', () => {
  for (const [fg, bg, min] of pairs) {
    it(`${fg} sobre ${bg} >= ${min}`, () => {
      expect(contrastRatio(tok(fg), tok(bg))).toBeGreaterThanOrEqual(min);
    });
  }
  it('registra os valores', () => {
    const rows = pairs.map(([f, b]) => `${f}/${b}: ${contrastRatio(tok(f), tok(b)).toFixed(2)}`);
    expect(rows.length).toBe(pairs.length);
    console.warn(rows.join('\n'));
  });
});
