import { ALPHABET, exampleWords } from './alphabet';
import { spellable } from './games';
import { normalizeSpoken } from './clipkey';

/** Frases fixas que a Iasmyn fala. */
export const FIXED_PHRASES = ['Voilà, bravo!', "Bonjour! Je m'appelle Iasmyn."];

/**
 * Tudo o que a área "Brincar" pode falar em voz alta. Serve para gerar os arquivos de áudio
 * e para testar que nenhum texto falado ficou sem áudio.
 */
export function spokenTexts(
  vocab: Array<{ fr: string; pt: string }>,
  phrases: Array<{ fr: string }>,
): string[] {
  const out = new Set<string>();
  for (const l of ALPHABET) out.add(l.name);
  for (const e of Object.values(exampleWords(vocab))) out.add(e.fr);
  for (const w of spellable(vocab)) out.add(w.fr);
  for (const v of vocab) out.add(v.fr); // cartas do jogo da memória
  for (const p of phrases) if (p.fr.split(' ').length <= 10) out.add(p.fr);
  for (const f of FIXED_PHRASES) out.add(f);
  return [...out].map(normalizeSpoken).filter(Boolean);
}
