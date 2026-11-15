import { ALPHABET, type Letter } from './alphabet';

export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Escolhe `n` itens que o jogador ainda não viu. Quando os não vistos acabam, recomeça o ciclo
 * (zera a lista de vistos) sem repetir dentro da mesma rodada.
 */
export function pickUnseen<T>(
  items: T[],
  seen: string[],
  key: (x: T) => string,
  n: number,
  rng: Rng,
): { picked: T[]; seen: string[] } {
  let seenSet = new Set(seen);
  let pool = items.filter((x) => !seenSet.has(key(x)));
  let picked: T[] = shuffle(pool, rng).slice(0, n);
  if (picked.length < n) {
    // acabou o ciclo: começa outro, sem repetir o que já saiu agora
    const taken = new Set(picked.map(key));
    pool = items.filter((x) => !taken.has(key(x)));
    picked = [...picked, ...shuffle(pool, rng).slice(0, n - picked.length)];
    seenSet = new Set(picked.map(key));
    return { picked, seen: [...seenSet] };
  }
  for (const p of picked) seenSet.add(key(p));
  return { picked, seen: [...seenSet] };
}

export interface ListenRound {
  target: Letter;
  options: Letter[];
}

/** Rodada de "que letra é essa?": a letra-alvo mais 3 diferentes, embaralhadas. */
export function listenRound(rng: Rng, avoid: string[] = []): ListenRound {
  const candidates = ALPHABET.filter((l) => !avoid.includes(l.letter));
  const target = (candidates.length ? candidates : ALPHABET)[
    Math.floor(rng() * (candidates.length || ALPHABET.length))
  ]!;
  const others = shuffle(
    ALPHABET.filter((l) => l.letter !== target.letter),
    rng,
  ).slice(0, 3);
  return { target, options: shuffle([target, ...others], rng) };
}

/** Palavras do e-book que dá para soletrar: só letras de a a z, de 3 a 8 letras (sem acento, hífen, espaço nem apóstrofo). */
export function spellable(
  vocab: Array<{ fr: string; pt: string }>,
): Array<{ fr: string; pt: string }> {
  const seen = new Set<string>();
  return vocab.filter((v) => {
    if (!/^[a-z]{3,8}$/.test(v.fr) || seen.has(v.fr)) return false;
    seen.add(v.fr);
    return true;
  });
}

/** Banco de letras para montar a palavra: as letras da palavra embaralhadas mais algumas letras extras. */
export function spellingBank(word: string, rng: Rng, extras = 2): string[] {
  const letters = word.toUpperCase().split('');
  const pool = ALPHABET.map((l) => l.letter).filter((l) => !letters.includes(l));
  return shuffle([...letters, ...shuffle(pool, rng).slice(0, extras)], rng);
}

export interface MemoryCard {
  id: string;
  pair: string;
  text: string;
  side: 'fr' | 'pt';
}

/** Cartas do jogo da memória: pares francês e português, textos curtos e sem repetir tradução. */
export function memoryDeck(
  vocab: Array<{ fr: string; pt: string }>,
  pairs: number,
  seen: string[],
  rng: Rng,
): { cards: MemoryCard[]; seen: string[] } {
  const ok = vocab.filter(
    (v) => v.fr.length <= 18 && v.pt.length <= 18 && !/[()/…?]/.test(v.fr + v.pt),
  );
  const uniq: Array<{ fr: string; pt: string }> = [];
  const frs = new Set<string>();
  const pts = new Set<string>();
  for (const v of ok) {
    const f = v.fr.toLowerCase();
    const p = v.pt.toLowerCase();
    if (frs.has(f) || pts.has(p)) continue;
    frs.add(f);
    pts.add(p);
    uniq.push(v);
  }
  const { picked, seen: nextSeen } = pickUnseen(uniq, seen, (x) => x.fr, pairs, rng);
  const cards = picked.flatMap((v, i): MemoryCard[] => [
    { id: `f${i}`, pair: String(i), text: v.fr, side: 'fr' },
    { id: `p${i}`, pair: String(i), text: v.pt, side: 'pt' },
  ]);
  return { cards: shuffle(cards, rng), seen: nextSeen };
}
