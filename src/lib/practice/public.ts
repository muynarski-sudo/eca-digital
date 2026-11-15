import type { Question } from '@/lib/content/schema';
import { audioKey } from '@/lib/audio/key';
import { isLocalMode } from '@/lib/local/mode';
import type { PublicQuestion } from './types';

function det(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
const stable = <T>(arr: T[], seed: string) =>
  [...arr]
    .map((v, i) => ({ v, k: det(`${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);

export function toPublic(q: Question): PublicQuestion {
  return {
    id: q.id,
    unit: q.unit,
    type: q.type,
    skill: q.skill,
    prompt: q.prompt,
    hint: q.hint,
    choices: q.choices,
    words: q.words,
    pairs: q.pairs
      ? {
          lefts: q.pairs.map((p) => p.left),
          rights: stable(
            q.pairs.map((p) => p.right),
            q.id,
          ),
        }
      : undefined,
    speakText: q.type === 'speak' ? q.audio_text : undefined,
    audioKey: q.audio_text ? audioKey(q.audio_text) : undefined,
    audioFallback: q.type === 'dictation' && isLocalMode() ? q.audio_text : undefined,
  };
}
