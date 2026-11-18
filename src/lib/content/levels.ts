import { CEFR, type Cefr } from './schema';

/** Níveis de cada área (a gramática vai até o B2). */
export const AREA_LEVELS = {
  leitura: CEFR,
  gramatica: ['A1', 'A2', 'B1', 'B2'] as const,
  vocabulario: CEFR,
} as const;

/** Lê o nível da URL (a1, A1...) e devolve o CEFR válido para a área, ou null. */
export function parseLevel(param: string, area: keyof typeof AREA_LEVELS): Cefr | null {
  const up = param.toUpperCase();
  return (AREA_LEVELS[area] as readonly string[]).includes(up) ? (up as Cefr) : null;
}
