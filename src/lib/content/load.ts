import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  contentSchemas,
  type Conjugation,
  type CultureTip,
  type Dialogue,
  type LexiconItem,
  type Phrase,
  type Reading,
  type Question,
  type Unit,
  type VocabItem,
} from './schema';

export interface ContentBundle {
  units: Unit[];
  vocab: VocabItem[];
  questions: Question[];
  conjugations: Conjugation[];
  dialogues: Dialogue[];
  phrases: Phrase[];
  culture: CultureTip[];
  readings: Reading[];
  lexicon: LexiconItem[];
}

/** Lê e valida todos os arquivos de content/data. Aceita sufixos (ex.: units.a2.json) para novos níveis. */
export function loadContent(dir = path.join(process.cwd(), 'content', 'data')): ContentBundle {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows = (base: keyof typeof contentSchemas): unknown[] => {
    const prefix = base.replace('.json', '');
    return files
      .filter((f) => f === base || f.startsWith(prefix + '.'))
      .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as unknown[]);
  };
  return {
    units: contentSchemas['units.json'].parse(rows('units.json')),
    vocab: contentSchemas['vocab.json'].parse(rows('vocab.json')),
    questions: contentSchemas['questions.json'].parse(rows('questions.json')),
    conjugations: contentSchemas['conjugations.json'].parse(rows('conjugations.json')),
    dialogues: contentSchemas['dialogues.json'].parse(rows('dialogues.json')),
    phrases: contentSchemas['phrases.json'].parse(rows('phrases.json')),
    culture: contentSchemas['culture.json'].parse(rows('culture.json')),
    readings: contentSchemas['readings.json'].parse(rows('readings.json')),
    lexicon: contentSchemas['lexicon.json'].parse(rows('lexicon.json')),
  };
}

/** Itens liberados para uso em exercícios, flashcards e áudio. */
export const isUsable = (x: { needs_review: boolean }) => !x.needs_review;
