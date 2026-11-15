import type { Question } from '@/lib/content/schema';

/** Questão como o cliente enxerga: sem a resposta. */
export interface PublicQuestion {
  id: string;
  unit: string | null;
  type: Question['type'];
  skill: Question['skill'];
  prompt: string;
  hint?: string;
  choices?: string[];
  words?: string[];
  pairs?: { lefts: string[]; rights: string[] };
  /** Só em "speak": a frase-modelo (aparece na tela). */
  speakText?: string;
  audioKey?: string;
}

export interface AnswerResult {
  verdict: 'correct' | 'almost' | 'wrong';
  score: number;
  expected: string;
  explanation: string;
  unitMastery?: number;
}
