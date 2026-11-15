/**
 * Regras do francês que o e-book ensina (números e horas), em funções puras.
 * Usadas só para gerar exercícios marcados `source: "generated"`. Cobrem apenas o que o e-book descreve.
 */
const UNITS = [
  'zéro',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];
const TENS: Record<number, string> = {
  20: 'vingt',
  30: 'trente',
  40: 'quarante',
  50: 'cinquante',
  60: 'soixante',
};

/** Número por extenso de 1 a 99. O 80 fica de fora (o e-book escreve "quatre-vingt" e o padrão é "quatre-vingts"). */
export function numberToFrench(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 99 || n === 80) return null;
  if (n < 20) return UNITS[n]!;
  if (n < 70) {
    const t = Math.floor(n / 10) * 10;
    const u = n % 10;
    return u === 0 ? TENS[t]! : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  }
  if (n < 80) {
    // 70 a 79: soixante + 10 a 19; o 71 usa "et"
    const r = n - 60;
    return n === 71 ? 'soixante et onze' : `soixante-${UNITS[r]}`;
  }
  // 81 a 99: quatre-vingt + 1 a 19 (sem "et")
  return `quatre-vingt-${UNITS[n - 80]}`;
}

const HOUR_WORD = (h12: number) => (h12 === 1 ? 'une heure' : `${UNITS[h12]} heures`);

/**
 * Hora por extenso no relógio de 12 horas, como no e-book ("16h = quatre heures").
 * Só devolve para casos que o e-book cobre: horas cheias, minutos de 5 em 5 até 25, "et quart", "et demie" e "moins ...".
 * Meio-dia e meia-noite só em hora cheia. Retorna null nos demais casos.
 */
export function timeToFrench(h24: number, m: number): string | null {
  if (
    !Number.isInteger(h24) ||
    h24 < 0 ||
    h24 > 23 ||
    ![0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(m)
  )
    return null;
  if (m === 0) {
    if (h24 === 12) return 'midi';
    if (h24 === 0) return 'minuit';
    return HOUR_WORD(h24 % 12 === 0 ? 12 : h24 % 12);
  }
  if (h24 === 12 || h24 === 0) return null;
  const h12 = h24 % 12;
  if (m <= 30) {
    const tail = m === 15 ? 'et quart' : m === 30 ? 'et demie' : numberToFrench(m)!;
    return `${HOUR_WORD(h12)} ${tail}`;
  }
  const next = (h24 + 1) % 24;
  if (next === 12 || next === 0) return null;
  const nh12 = next % 12 === 0 ? 12 : next % 12;
  const left = 60 - m;
  return `${HOUR_WORD(nh12)} moins ${left === 15 ? 'le quart' : numberToFrench(left)!}`;
}
