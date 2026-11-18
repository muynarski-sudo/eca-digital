/* Gera content/data/*.json a partir do texto-fonte (conjugações) e dos módulos de autoria em scripts/content. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  PERSONS,
  TENSES,
  contentSchemas,
  type Conjugation,
  type Person,
  type Question,
  type Tense,
} from '../src/lib/content/schema';
import { units } from './content/units';
import { vocab } from './content/vocab';
import { ebookQuestions } from './content/questions-ebook';
import { assignTopics } from './content/topics';
import {
  grammarLevelExercises,
  lexiconFromSource,
  lexiconQuestions,
  readingQuestions,
  readingsFromSource,
} from './content/library';
import { dialogues, phrases, culture } from './content/texts';
import {
  Dedup,
  articleFill,
  ascii,
  conjugationExercises,
  femininePairs,
  matchSets,
  numberExercises,
  phraseExercises,
  timeExercises,
  vocabChoice,
  vocabTypein,
} from './content/generators';

const SOURCE = 'content/source/ebook-falando-frances-fonte.txt';

function parseConjugations(): Conjugation[] {
  const txt = readFileSync(SOURCE, 'utf8');
  const start = txt.indexOf('## TABLEAU DES CONJUGAISONS');
  const end = txt.indexOf('# GABARITO');
  if (start < 0 || end < 0) throw new Error('Seção de conjugações não encontrada no texto-fonte');
  const lines = txt
    .slice(start, end)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && l !== '|');
  const out: Conjugation[] = [];
  const isHeader = (l: string) =>
    /^[A-ZÀ-ÖØ-Þ' ]+ [–-] [A-ZÀ-ÖØ-Þ/ ]+$/.test(l) && !l.includes('|');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!isHeader(line) || lines[i + 1] !== 'PRÉSENT') continue;
    const [verbRaw, ptRaw] = line.split(/ [–-] /) as [string, string];
    // Depois do cabeçalho vêm 5 rótulos de tempo e 6 linhas x 5 células, onde a 1ª célula está sozinha na linha e as demais começam com "|".
    let j = i + 1;
    while (lines[j] && !/^je |^j'/i.test(lines[j]!)) j++;
    const rows: string[][] = [];
    while (rows.length < 6) {
      const cells: string[] = [];
      const first = lines[j]!;
      j++;
      cells.push(first.replace(/\|$/, '').trim());
      while (cells.length < 5) {
        const l = lines[j]!;
        j++;
        cells.push(l.replace(/^\|/, '').replace(/\|$/, '').trim());
      }
      rows.push(cells);
    }
    const tenses = {} as Record<Tense, Record<Person, string>>;
    TENSES.forEach((t, ti) => {
      tenses[t] = {} as Record<Person, string>;
      PERSONS.forEach((p, pi) => {
        tenses[t][p] = rows[pi]![ti]!;
      });
    });
    const verb = verbRaw.toLowerCase();
    out.push({
      id: `conj-${ascii(verb).replace(/-/g, '')}`,
      verb,
      pt: ptRaw.toLowerCase(),
      tenses,
      source: 'ebook',
      needs_review: false,
    });
  }
  return out;
}

function main() {
  const conjs = parseConjugations();
  if (conjs.length !== 17) throw new Error(`Esperava 17 verbos, achei ${conjs.length}`);
  const dedup = new Dedup();
  const lexicon = lexiconFromSource();
  // exercícios do próprio e-book (com gabarito) vêm primeiro e têm prioridade sobre os gerados
  const fromEbook = ebookQuestions.map((q) => ({ ...q, concept: `ex:${q.id}` }));
  dedup.take(fromEbook);
  const generated: Question[] = dedup.take([
    ...vocabChoice(vocab),
    ...vocabTypein(vocab),
    ...articleFill(vocab),
    ...femininePairs(vocab),
    ...matchSets(vocab),
    ...phraseExercises(phrases),
    ...numberExercises(),
    ...timeExercises(),
    ...conjugationExercises(conjs),
    ...grammarLevelExercises(conjs),
    ...lexiconQuestions(lexicon, vocab),
  ]);
  // perguntas de leitura podem repetir o enunciado de um texto para outro ("Qual é a conclusão do autor?"), então não passam pelo filtro de repetidas
  const questions = assignTopics(
    [...fromEbook, ...generated, ...readingQuestions()],
    vocab,
    phrases,
  );
  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) throw new Error(`id repetido na geração: ${q.id}`);
    ids.add(q.id);
  }
  const data = {
    'units.json': units,
    'vocab.json': vocab,
    'questions.json': questions,
    'conjugations.json': conjs,
    'dialogues.json': dialogues,
    'phrases.json': phrases,
    'culture.json': culture,
    'readings.json': readingsFromSource(),
    'lexicon.json': lexicon,
  } as const;
  mkdirSync('content/data', { recursive: true });
  for (const [file, rows] of Object.entries(data)) {
    const parsed = contentSchemas[file as keyof typeof contentSchemas].parse(rows);
    writeFileSync(`content/data/${file}`, JSON.stringify(parsed, null, 1) + '\n');
    console.warn(`${file}: ${parsed.length}`);
  }
}
main();
