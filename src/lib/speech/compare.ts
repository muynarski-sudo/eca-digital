import { normalize, stripAccents } from '@/lib/domain/grade';

export interface WordResult {
  word: string;
  understood: boolean;
}
export interface SpeechComparison {
  words: WordResult[];
  extra: string[];
  /** 0 a 1: fração das palavras esperadas que foram compreendidas */
  ratio: number;
  verdict: 'correct' | 'almost' | 'wrong';
  score: number;
}

/** Sem apóstrofos ("s'il" vira "sil"). */
const tokens = (s: string) => stripAccents(normalize(s)).replace(/'/g, '').split(/\s+/).filter(Boolean);
/** O reconhecedor às vezes separa a elisão ("j ai"): junta letras soltas de elisão ao termo seguinte. */
const heardTokens = (s: string) => tokens(stripAccents(normalize(s)).replace(/(^|\s)(j|l|d|s|n|m|t|c|qu)\s+(?=\S)/g, "$1$2"));

/** Compara a transcrição com a frase esperada, tolerando acentos e pontuação. É "foi compreendido", não nota de sotaque. */
export function compareSpoken(expected: string, transcript: string): SpeechComparison {
  const display = expected.split(/\s+/).filter((w) => tokens(w).length > 0);
  const exp: Array<{ tok: string; owner: number }> = [];
  display.forEach((w, i) => tokens(w).forEach((tok) => exp.push({ tok, owner: i })));
  const heard = heardTokens(transcript);

  // LCS entre os tokens esperados e os ouvidos
  const n = exp.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = exp[i]!.tok === heard[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const matched = new Set<number>();
  const used = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (exp[i]!.tok === heard[j]) {
      matched.add(i);
      used.add(j);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  const words: WordResult[] = display.map((word, idx) => {
    const own = exp.map((e, k) => (e.owner === idx ? k : -1)).filter((k) => k >= 0);
    return { word, understood: own.length > 0 && own.every((k) => matched.has(k)) };
  });
  const understood = words.filter((w) => w.understood).length;
  const ratio = display.length === 0 ? 0 : understood / display.length;
  const extra = heard.filter((_, idx) => !used.has(idx));
  const verdict = ratio === 1 ? 'correct' : ratio >= 0.7 ? 'almost' : 'wrong';
  return { words, extra, ratio, verdict, score: verdict === 'correct' ? 1 : verdict === 'almost' ? 0.5 : 0 };
}
