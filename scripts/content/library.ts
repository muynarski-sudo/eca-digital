/* Áreas de leitura, gramática e vocabulário por nível (estilo lingua.com).
   - Leitura e vocabulário B1+/A2+ são conteúdo extra, gerado (source: "generated"), a conferir com falante nativo.
   - Gramática: as frases são autorais, mas as formas verbais vêm das tabelas de conjugação do e-book (nada de conjugar por conta própria). */
import {
  PERSONS,
  type Cefr,
  type Conjugation,
  type LexiconItem,
  type Person,
  type Question,
  type Reading,
  type Tense,
  type VocabItem,
} from '../../src/lib/content/schema';
import { splitSubject, TENSE_LABELS } from '../../src/lib/content/conjugation';
import { hash, mk, shuffled } from './generators';
import { LEXICON } from './lexicon-data';
import { READINGS } from './readings-data';

const LEVEL_DIFFICULTY: Record<Cefr, 1 | 2 | 3> = { A1: 1, A2: 1, B1: 2, B2: 2, C1: 3, C2: 3 };

export function readingsFromSource(): Reading[] {
  return READINGS.map((r) => ({
    id: `rd-${r.id}`,
    level: r.level,
    title: r.title,
    title_pt: r.title_pt,
    paragraphs: r.paragraphs,
    source: 'generated' as const,
    needs_review: false,
  }));
}

export function readingQuestions(): Question[] {
  const out: Question[] = [];
  for (const r of READINGS) {
    r.qs.forEach(([prompt, right, w1, w2, why], i) => {
      const n = i + 1;
      out.push(
        mk({
          id: `q-rd-${r.id}-${n}`,
          unit: null,
          type: 'multiple_choice',
          skill: 'vocabulario',
          concept: `rd:${r.id}:${n}`,
          prompt,
          answers: [right],
          choices: shuffled([right, w1, w2], `rd:${r.id}:${n}`),
          explanation: `No texto: ${why}`,
          error_tags: ['leitura'],
          difficulty: LEVEL_DIFFICULTY[r.level],
          track: 'leitura',
          cefr: r.level,
          reading: `rd-${r.id}`,
          source: 'generated',
        }),
      );
    });
  }
  return out;
}

// ---------- vocabulário por nível ----------
export function lexiconFromSource(): LexiconItem[] {
  const out: LexiconItem[] = [];
  for (const [level, words] of Object.entries(LEXICON) as Array<
    [Exclude<Cefr, 'A1'>, Array<[string, string]>]
  >) {
    words.forEach(([fr, pt], i) =>
      out.push({
        id: `lx-${level.toLowerCase()}-${String(i + 1).padStart(3, '0')}`,
        level,
        fr,
        pt,
        source: 'generated',
        needs_review: false,
      }),
    );
  }
  return out;
}

/** Palavras do e-book que servem como "palavra solta" no A1 (sem alfabeto, números, sons e itens com barra, parênteses ou reticências). */
const A1_SKIP = new Set([
  'alfabeto',
  'numeros',
  'ille_tion',
  'pronuncia_r',
  'vogais_juntas',
  'vogais_nasais',
  'feminino',
]);
export const a1Words = (vocab: VocabItem[]) =>
  vocab.filter(
    (v) =>
      !v.needs_review &&
      !A1_SKIP.has(v.category) &&
      !/[()/…?]/.test(v.fr) &&
      v.fr.length <= 28 &&
      v.pt.length <= 40,
  );

type Word = { key: string; level: Cefr; fr: string; pt: string };

export function lexiconQuestions(lexicon: LexiconItem[], vocab: VocabItem[]): Question[] {
  const words: Word[] = [
    ...a1Words(vocab).map((v) => ({ key: v.id, level: 'A1' as Cefr, fr: v.fr, pt: v.pt })),
    ...lexicon.map((l) => ({ key: l.id, level: l.level, fr: l.fr, pt: l.pt })),
  ];
  const out: Question[] = [];
  for (const w of words) {
    const same = words.filter((o) => o.level === w.level && o.key !== w.key && o.pt !== w.pt);
    const wrong = shuffled(same, `vl:${w.key}`)
      .map((o) => o.pt)
      .filter((p, i, a) => a.indexOf(p) === i)
      .slice(0, 3);
    if (wrong.length < 3) continue;
    out.push(
      mk({
        id: `q-vl-${w.level.toLowerCase()}-${w.key}`,
        unit: null,
        type: 'multiple_choice',
        skill: 'vocabulario',
        concept: `vl:${w.key}`,
        prompt: `Qual é o significado de “${w.fr}”?`,
        answers: [w.pt],
        choices: shuffled([w.pt, ...wrong], `vlc:${w.key}`),
        audio_text: w.fr,
        explanation: `${w.fr} significa "${w.pt}".`,
        error_tags: ['vocabulario_nivel'],
        difficulty: LEVEL_DIFFICULTY[w.level],
        track: 'vocabulario',
        cefr: w.level,
        source: w.level === 'A1' ? 'ebook' : 'generated',
      }),
    );
  }
  return out;
}

// ---------- gramática por nível ----------
/** Complementos que ficam naturais em todos os tempos e com qualquer pessoa. */
const COMPLEMENTS: Record<string, [string, string]> = {
  etre: ['à la maison', 'en retard'],
  avoir: ['beaucoup de travail', 'une bonne idée'],
  aller: ['au marché', 'au cinéma'],
  diner: ['au restaurant', 'à sept heures'],
  acheter: ['du pain', 'un livre'],
  manger: ['une pizza', 'du fromage'],
  boire: ['un café', "de l'eau"],
  dire: ['bonjour', 'la vérité'],
  faire: ['du sport', 'les courses'],
  voir: ['un film', 'la mer'],
  regarder: ['la télévision', 'un film'],
  vouloir: ['un café', 'une réponse'],
  habiter: ['à Paris', 'près de la gare'],
  mettre: ['la table', 'un pull'],
  aimer: ['le chocolat', 'la musique'],
  commencer: ['à travailler', 'un nouveau livre'],
  finir: ['le travail', 'le repas'],
};
const MARKERS: Record<Tense, string[]> = {
  present: ["Aujourd'hui,", 'En ce moment,', 'Le dimanche,'],
  passe_compose: ['Hier,', 'La semaine dernière,', 'Samedi dernier,'],
  futur_proche: ['Demain,', 'Ce soir,', 'Dans cinq minutes,'],
  imparfait: ['Autrefois,', 'Avant,', 'À cette époque-là,'],
  futur_simple: ["L'année prochaine,", 'Dans dix ans,', 'Un jour,'],
};
/** Que tempos e quantas frases por verbo em cada nível. B2 mistura todos (com o tempo indicado na dica). */
const GRAMMAR_PLAN: Record<'A1' | 'A2' | 'B1' | 'B2', Array<[Tense, number]>> = {
  A1: [['present', 3]],
  A2: [
    ['passe_compose', 2],
    ['futur_proche', 2],
  ],
  B1: [
    ['imparfait', 2],
    ['futur_simple', 2],
  ],
  B2: [
    ['present', 1],
    ['passe_compose', 1],
    ['futur_proche', 1],
    ['imparfait', 1],
    ['futur_simple', 1],
  ],
};

export function grammarLevelExercises(conjs: Conjugation[]): Question[] {
  const out: Question[] = [];
  for (const level of ['A1', 'A2', 'B1', 'B2'] as const) {
    for (const [tense, count] of GRAMMAR_PLAN[level]) {
      for (const c of conjs) {
        const base = c.id.replace('conj-', '');
        const comps = COMPLEMENTS[base];
        if (!comps) throw new Error(`faltam complementos para ${c.verb}`);
        for (let k = 0; k < count; k++) {
          // B2 usa outra combinação (pessoa, marcador e complemento) que os níveis anteriores
          const seed = hash(`${level}:${base}:${tense}`);
          const offset = level === 'B2' ? 3 : 0;
          const person = PERSONS[(seed + k * 2 + offset) % PERSONS.length]! as Person;
          const marker = MARKERS[tense][(seed + k + offset) % 3]!;
          const comp = comps[(k + (level === 'B2' ? 1 : 0)) % 2]!;
          const { subject, form } = splitSubject(c.tenses[tense][person]);
          const shown = person === 'il' ? 'il ' : person === 'ils' ? 'ils ' : subject;
          const row = PERSONS.map((p) => c.tenses[tense][p]).join(', ');
          out.push(
            mk({
              id: `q-gr-${level.toLowerCase()}-${base}-${tense.replace('_', '-')}-${k + 1}`,
              unit: null,
              type: 'fill_blank',
              skill: 'gramatica',
              concept: `gr:${level}:${base}:${tense}:${k}`,
              prompt: `${marker} ${shown}_____ ${comp}. (${c.verb})`,
              answers: [form],
              hint: `Tempo: ${TENSE_LABELS[tense]}`,
              explanation: `${TENSE_LABELS[tense]} de ${c.verb}: ${row}.`,
              error_tags: [`gramatica_${tense}`],
              difficulty: level === 'A1' ? 1 : level === 'B2' ? 3 : 2,
              track: 'gramatica',
              cefr: level,
              source: 'generated',
            }),
          );
        }
      }
    }
  }
  return out;
}
