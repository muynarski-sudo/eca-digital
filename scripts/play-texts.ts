/* Lista o que a área "Brincar" fala e grava .audio-cache/play-texts.json ({ chave: texto }).
   Depois rode scripts/play_audio.py para gerar os .mp3 (veja o README). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadContent, isUsable } from '../src/lib/content/load';
import { clipKey, normalizeSpoken } from '../src/lib/play/clipkey';
import { spokenTexts } from '../src/lib/play/texts';

const c = loadContent();
const vocab = c.vocab.filter(
  (v) => isUsable(v) && v.category !== 'alfabeto' && v.category !== 'numeros',
);
// palavras soltas do exercício de vocabulário por nível (A2 a C2) também têm áudio
const texts = [
  ...new Set([
    ...spokenTexts(vocab, c.phrases.filter(isUsable)),
    ...c.lexicon.filter(isUsable).map((l) => normalizeSpoken(l.fr)),
  ]),
];
mkdirSync('.audio-cache', { recursive: true });
writeFileSync(
  '.audio-cache/play-texts.json',
  JSON.stringify(Object.fromEntries(texts.map((t) => [clipKey(t), t])), null, 1),
);
console.warn(`${texts.length} textos em .audio-cache/play-texts.json`);
