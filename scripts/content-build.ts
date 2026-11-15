/* Gera content/data/*.json a partir do texto-fonte (conjugações) e dos módulos de autoria em scripts/content. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PERSONS, TENSES, contentSchemas, type Conjugation, type Person, type Question, type Tense, type VocabItem } from '../src/lib/content/schema';
import { splitSubject } from '../src/lib/content/conjugation';
import { units } from './content/units';
import { vocab } from './content/vocab';
import { ebookQuestions } from './content/questions-ebook';
import { dialogues, phrases, culture } from './content/texts';

const SOURCE = 'content/source/ebook-falando-frances-fonte.txt';

const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function parseConjugations(): Conjugation[] {
  const txt = readFileSync(SOURCE, 'utf8');
  const start = txt.indexOf('## TABLEAU DES CONJUGAISONS');
  const end = txt.indexOf('# GABARITO');
  if (start < 0 || end < 0) throw new Error('Seção de conjugações não encontrada no texto-fonte');
  const lines = txt.slice(start, end).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && l !== '|');
  const out: Conjugation[] = [];
  const isHeader = (l: string) => /^[A-ZÀ-ÖØ-Þ' ]+ [–-] [A-ZÀ-ÖØ-Þ/ ]+$/.test(l) && !l.includes('|');
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
      let first = lines[j]!;
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
      id: `conj-${ascii(verb)}`,
      verb,
      pt: ptRaw.toLowerCase(),
      tenses,
      source: 'ebook',
      needs_review: false,
    });
  }
  return out;
}

// ---------- geração determinística de questões ----------
function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function shuffled<T>(arr: T[], seed: string): T[] {
  return [...arr].map((v, i) => ({ v, k: hash(`${seed}:${i}`) })).sort((a, b) => a.k - b.k).map((x) => x.v);
}

const usableVocab = (v: VocabItem) => !v.needs_review;

function multipleChoice(): Question[] {
  const out: Question[] = [];
  for (const u of units) {
    const items = vocab.filter((v) => v.unit === u.id && usableVocab(v) && v.category !== 'numeros' && !/\(/.test(v.pt));
    const picks = items.filter((_, i) => i % 3 === 0).slice(0, 5);
    picks.forEach((v, idx) => {
      const pool = vocab.filter((o) => o.id !== v.id && usableVocab(o) && o.pt !== v.pt && !/\(/.test(o.pt) && o.category !== 'numeros');
      const sameCat = pool.filter((o) => o.category === v.category);
      const others = shuffled([...sameCat, ...pool.filter((o) => o.category !== v.category)], v.id);
      const distract: string[] = [];
      for (const o of others) if (!distract.includes(o.pt) && distract.length < 3) distract.push(o.pt);
      const choices = shuffled([v.pt, ...distract], `ch:${v.id}`);
      out.push({
        id: `q-mc-${u.id}-${String(idx + 1).padStart(3, '0')}`, unit: u.id, type: 'multiple_choice', skill: 'vocabulario',
        prompt: `O que significa "${v.fr}"?`, answers: [v.pt], choices, hint: v.pron ? `Pronúncia: (${v.pron})` : undefined,
        explanation: `${v.fr} significa "${v.pt}".${v.example ? ` Exemplo: ${v.example.fr} (${v.example.pt})` : ''}`,
        error_tags: ['vocabulario_' + v.category], difficulty: 1, source: 'ebook', needs_review: false,
      });
    });
  }
  return out;
}

const PAIR_SETS: Array<[unit: string, category: string, title: string]> = [
  ['u01', 'saudacoes', 'saudações'], ['u03', 'viagem', 'viagem'], ['u04', 'interrogativas', 'palavras de pergunta'],
  ['u05', 'expressoes_avoir', 'expressões com avoir'], ['u08', 'dias', 'dias da semana'], ['u08', 'meses', 'meses'],
  ['u08', 'estacoes', 'estações'], ['u09', 'preposicoes_lugar', 'preposições de lugar'], ['u10', 'restaurante', 'restaurante'],
  ['u10', 'direcoes', 'direções'], ['u10', 'emergencias', 'emergências'],
];
function matchPairs(): Question[] {
  return PAIR_SETS.map(([unit, cat, title], i) => {
    const items = vocab.filter((v) => v.unit === unit && v.category === cat && usableVocab(v)).slice(0, 4);
    return {
      id: `q-mp-${unit}-${String(i + 1).padStart(3, '0')}`, unit, type: 'match_pairs' as const, skill: 'vocabulario' as const,
      prompt: `Ligue cada palavra à tradução (${title}).`, answers: [], pairs: items.map((v) => ({ left: v.fr, right: v.pt })),
      explanation: items.map((v) => `${v.fr} = ${v.pt}`).join('; ') + '.', error_tags: ['vocabulario_' + cat], difficulty: 1,
      source: 'ebook' as const, needs_review: false,
    };
  });
}

const seenFr = new Set<string>();
const okPhrases = phrases.filter((p) => {
  if (p.needs_review || seenFr.has(p.fr)) return false;
  seenFr.add(p.fr);
  return true;
});
const wc = (s: string) => s.split(/\s+/).length;

/** Embaralha de forma determinística, garantindo que a ordem final seja diferente da correta. */
function scrambled(words: string[], seed: string): string[] {
  const out = shuffled(words, seed);
  return out.join(' ') === words.join(' ') ? [...out].reverse() : out;
}

function orderWords(): Question[] {
  const picks = okPhrases.filter((p) => wc(p.fr) >= 4 && wc(p.fr) <= 8 && !/[()]/.test(p.fr)).filter((_, i) => i % 3 === 0).slice(0, 14);
  return picks.map((p, i) => {
    const joined = p.fr.replace(/\s+([?!])/g, '$1');
    const words = joined.split(/\s+/);
    return {
      id: `q-ow-${p.unit}-${String(i + 1).padStart(3, '0')}`, unit: p.unit, type: 'order_words' as const, skill: 'gramatica' as const,
      prompt: `Coloque as palavras na ordem: "${p.pt}"`, answers: [joined, p.fr], words: scrambled(words, p.id),
      explanation: `${p.fr} (${p.pt})`, error_tags: ['ordem_palavras'], difficulty: 2 as const, source: 'ebook' as const, needs_review: false,
    };
  });
}

function audioQuestions(): Question[] {
  const short = okPhrases.filter((p) => wc(p.fr) >= 2 && wc(p.fr) <= 9 && !/[()]/.test(p.fr));
  const dict = short.filter((_, i) => i % 3 === 1).slice(0, 18);
  const speak = short.filter((_, i) => i % 3 === 2).slice(0, 18);
  const d: Question[] = dict.map((p, i) => ({
    id: `q-di-${p.unit}-${String(i + 1).padStart(3, '0')}`, unit: p.unit, type: 'dictation', skill: 'escuta',
    prompt: 'Ouça e escreva o que você ouviu.', answers: [p.fr], audio_text: p.fr, hint: `Situação: ${p.situation}`,
    explanation: `${p.fr} (${p.pt})`, error_tags: ['escuta_' + p.unit], difficulty: 2, source: 'ebook', needs_review: false,
  }));
  const s: Question[] = speak.map((p, i) => ({
    id: `q-sp-${p.unit}-${String(i + 1).padStart(3, '0')}`, unit: p.unit, type: 'speak', skill: 'fala',
    prompt: 'Ouça o modelo e repita a frase.', answers: [p.fr], audio_text: p.fr, hint: p.pron ? `Pronúncia: (${p.pron})` : undefined,
    explanation: `${p.fr} (${p.pt})`, error_tags: ['fala_' + p.unit], difficulty: 2, source: 'ebook', needs_review: false,
  }));
  return [...d, ...s];
}

const VERB_UNIT: Record<string, string | null> = { conjetre: 'u01', conjavoir: 'u05', conjfaire: 'u05', conjaller: 'u05' };
function conjugateQuestions(conjs: Conjugation[]): Question[] {
  const out: Question[] = [];
  for (const c of conjs) {
    const base = ascii(c.verb);
    const unit = VERB_UNIT['conj' + base] ?? null;
    const irregular = ['etre', 'avoir', 'aller', 'faire', 'boire', 'dire', 'voir', 'vouloir', 'mettre'].includes(base);
    const row = PERSONS.map((p) => c.tenses.present[p]).join(', ');
    for (const p of PERSONS) {
      const full = c.tenses.present[p];
      const { subject, form } = splitSubject(full);
      out.push({
        id: `q-conj-${base}-present-${p}`, unit, type: 'conjugate', skill: 'gramatica',
        prompt: `Conjugue ${c.verb} (${c.pt}) no présent: ${subject}_____`, answers: [form],
        explanation: `Présent de ${c.verb}: ${row}.`,
        error_tags: [['etre', 'avoir', 'faire', 'aller'].includes(base) ? `conjugacao_${base}` : irregular ? 'conjugacao_irregular' : 'conjugacao_regular'],
        difficulty: irregular ? 2 : 1, source: 'ebook', needs_review: false,
      });
    }
  }
  return out;
}

function main() {
  const conjs = parseConjugations();
  if (conjs.length !== 17) throw new Error(`Esperava 17 verbos, achei ${conjs.length}`);
  const questions = [...ebookQuestions, ...multipleChoice(), ...matchPairs(), ...orderWords(), ...audioQuestions(), ...conjugateQuestions(conjs)];
  const data = {
    'units.json': units, 'vocab.json': vocab, 'questions.json': questions, 'conjugations.json': conjs,
    'dialogues.json': dialogues, 'phrases.json': phrases, 'culture.json': culture,
  } as const;
  mkdirSync('content/data', { recursive: true });
  for (const [file, rows] of Object.entries(data)) {
    const parsed = contentSchemas[file as keyof typeof contentSchemas].parse(rows);
    writeFileSync(`content/data/${file}`, JSON.stringify(parsed, null, 1) + '\n');
    console.warn(`${file}: ${parsed.length}`);
  }
}
main();
