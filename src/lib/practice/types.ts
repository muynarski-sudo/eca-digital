import type { Question } from '@/lib/content/schema';

/** Questão como o cliente enxerga: sem a resposta. */
export interface PublicQuestion {
  id: string;
  unit: string | null;
  type: Question['type'];
  skill: Question['skill'];
  prompt: string;
  /** 1 iniciante, 2 intermediário, 3 avançado. */
  level?: number;
  topic?: string;
  hint?: string;
  choices?: string[];
  words?: string[];
  pairs?: { lefts: string[]; rights: string[] };
  /** Só em "speak": a frase-modelo (aparece na tela). */
  speakText?: string;
  audioKey?: string;
  /** Só no modo local: texto para a voz do navegador tocar o ditado quando não há arquivo de áudio. */
  audioFallback?: string;
}

export interface AnswerResult {
  verdict: 'correct' | 'almost' | 'wrong';
  score: number;
  expected: string;
  /** Aviso em resposta certa (por exemplo, o acento que faltou). */
  note?: string;
  explanation: string;
  unitMastery?: number;
}
