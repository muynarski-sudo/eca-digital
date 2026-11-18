/* Lista os textos de leitura e grava .audio-cache/reading-texts.json ({ id: texto inteiro }).
   Depois: python3 scripts/play_audio.py --voice <voz.onnx> --texts .audio-cache/reading-texts.json --out public/audio/reading */
import { mkdirSync, writeFileSync } from 'node:fs';
import { isUsable, loadContent } from '../src/lib/content/load';

const c = loadContent();
const texts = Object.fromEntries(
  c.readings.filter(isUsable).map((r) => [r.id, r.paragraphs.join(' ')]),
);
mkdirSync('.audio-cache', { recursive: true });
writeFileSync('.audio-cache/reading-texts.json', JSON.stringify(texts, null, 1));
console.warn(`${Object.keys(texts).length} textos em .audio-cache/reading-texts.json`);
