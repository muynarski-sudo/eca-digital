import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { contentSchemas, type Conjugation, type CultureTip, type Dialogue, type Phrase, type Question, type Unit, type VocabItem } from './schema';

export interface ContentBundle {
  units: Unit[];
  vocab: VocabItem[];
  questions: Question[];
  conjugations: Conjugation[];
  dialogues: Dialogue[];
  phrases: Phrase[];
  culture: CultureTip[];
}

/** Lê e valida todos os arquivos de content/data. Aceita sufixos (ex.: units.a2.json) para novos níveis. */
export function loadContent(dir = path.join(process.cwd(), 'content', 'data')): ContentBundle {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const read = <K extends keyof typeof contentSchemas>(base: K) => {
    const prefix = base.replace('.json', '');
    const rows: unknown[] = [];
    for (const f of files.filter((f) => f === base || f.startsWith(prefix + '.'))) {
      rows.push(...(JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as unknown[]));
    }
    return contentSchemas[base].parse(rows);
  };
  return {
    units: read('units.json'),
    vocab: read('vocab.json'),
    questions: read('questions.json'),
    conjugations: read('conjugations.json'),
    dialogues: read('dialogues.json'),
    phrases: read('phrases.json'),
    culture: read('culture.json'),
  };
}

/** Itens liberados para uso em exercícios, flashcards e áudio. */
export const isUsable = (x: { needs_review: boolean }) => !x.needs_review;
