/* Geradores de exercícios a partir do conteúdo do e-book (vocabulário, frases, tabelas de conjugação, regras de números e horas).
   Tudo determinístico: rodar de novo gera os mesmos ids e textos. Nada de francês inventado: só reorganiza o que o e-book traz. */
import {
  PERSONS,
  PRACTICE_TENSES,
  type Conjugation,
  type Phrase,
  type Question,
  type VocabItem,
} from '../../src/lib/content/schema';
import { splitSubject } from '../../src/lib/content/conjugation';
import { numberToFrench, timeToFrench } from '../../src/lib/content/french';
import { categoryLabel } from '../../src/lib/content/labels';

export const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function shuffled<T>(arr: T[], seed: string): T[] {
  return [...arr]
    .map((v, i) => ({ v, k: hash(`${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}
/** Ordem embaralhada garantidamente diferente da original. */
function scrambled(words: string[], seed: string): string[] {
  const out = shuffled(words, seed);
  return out.join(' ') === words.join(' ') ? [...out].reverse() : out;
}

type Base = Pick<
  Question,
  | 'id'
  | 'unit'
  | 'type'
  | 'skill'
  | 'prompt'
  | 'answers'
  | 'explanation'
  | 'error_tags'
  | 'difficulty'
  | 'concept'
> &
  Partial<Question>;
const mk = (q: Base): Question => ({ source: 'ebook', needs_review: false, ...q }) as Question;

const usableVocab = (v: VocabItem) =>
  !v.needs_review && v.category !== 'alfabeto' && v.category !== 'numeros';
const basePt = (s: string) =>
  s
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const cleanTypein = (v: VocabItem) => !/[()/…?]/.test(v.fr) && v.fr.length <= 40;

/** Pool sem enunciados repetidos (ignora caixa): a primeira ocorrência vence, e o gabarito do e-book vem primeiro. */
export class Dedup {
  private seen = new Set<string>();
  take(list: Question[]): Question[] {
    return list.filter((q) => {
      const k = q.prompt.trim().toLowerCase();
      if (this.seen.has(k)) return false;
      this.seen.add(k);
      return true;
    });
  }
}

// ---------- vocabulário ----------
export function vocabChoice(vocab: VocabItem[]): Question[] {
  const pool = vocab.filter(usableVocab);
  const out: Question[] = [];
  for (const v of pool) {
    const others = pool.filter(
      (o) =>
        o.id !== v.id && basePt(o.pt) !== basePt(v.pt) && o.fr.toLowerCase() !== v.fr.toLowerCase(),
    );
    const same = shuffled(
      others.filter((o) => o.category === v.category),
      `d1:${v.id}`,
    );
    const rest = shuffled(
      others.filter((o) => o.category !== v.category),
      `d2:${v.id}`,
    );
    const pick = <T>(list: T[], key: (x: T) => string) => {
      const used = new Set<string>();
      const res: T[] = [];
      for (const x of list)
        if (!used.has(key(x).toLowerCase()) && res.length < 3) {
          used.add(key(x).toLowerCase());
          res.push(x);
        }
      return res;
    };
    const ptD = pick([...same, ...rest], (o) => o.pt);
    if (ptD.length === 3) {
      out.push(
        mk({
          id: `q-vfp-${v.id}`,
          unit: v.unit,
          type: 'multiple_choice',
          skill: 'vocabulario',
          concept: `v:${v.id}`,
          prompt: `O que significa "${v.fr}"?`,
          answers: [v.pt],
          choices: shuffled([v.pt, ...ptD.map((o) => o.pt)], `c1:${v.id}`),
          hint: v.pron ? `Pronúncia: (${v.pron})` : undefined,
          explanation: `${v.fr} significa "${v.pt}".${v.example ? ` Exemplo: ${v.example.fr} (${v.example.pt})` : ''}`,
          error_tags: [`vocabulario_${v.category}`],
          difficulty: 1,
        }),
      );
    }
    const frD = pick([...same, ...rest], (o) => o.fr);
    if (frD.length === 3) {
      out.push(
        mk({
          id: `q-vpf-${v.id}`,
          unit: v.unit,
          type: 'multiple_choice',
          skill: 'vocabulario',
          concept: `v:${v.id}`,
          prompt: `Como se diz "${v.pt}" em francês?`,
          answers: [v.fr],
          choices: shuffled([v.fr, ...frD.map((o) => o.fr)], `c2:${v.id}`),
          explanation: `"${v.pt}" é ${v.fr}.${v.example ? ` Exemplo: ${v.example.fr} (${v.example.pt})` : ''}`,
          error_tags: [`vocabulario_${v.category}`],
          difficulty: 2,
        }),
      );
    }
  }
  return out;
}

/** Resposta oficial e a versão sem artigo/pronome inicial ("o hotel": l'hôtel ou hôtel). */
function typeinAnswers(fr: string): string[] {
  const m = /^(?:(?:le|la|les|un|une|des)\s+|l')(.+)$/i.exec(fr);
  return m && m[1] && !/\s/.test(m[1]) ? [fr, m[1]] : [fr];
}

export function vocabTypein(vocab: VocabItem[]): Question[] {
  return vocab
    .filter((v) => usableVocab(v) && cleanTypein(v))
    .map((v) =>
      mk({
        id: `q-vty-${v.id}`,
        unit: v.unit,
        type: 'translate_pt_fr',
        skill: 'vocabulario',
        concept: `v:${v.id}`,
        prompt: `Escreva em francês: ${v.pt}`,
        answers: typeinAnswers(v.fr),
        hint: v.pron ? `Pronúncia: (${v.pron})` : undefined,
        explanation: `${v.pt} em francês é "${v.fr}".${v.example ? ` Exemplo: ${v.example.fr} (${v.example.pt})` : ''}`,
        error_tags: [`vocabulario_${v.category}`],
        // uma palavra só = nível 2; expressão com várias palavras = nível 3
        difficulty: v.fr.trim().split(/\s+/).length > 1 ? 3 : 2,
      }),
    );
}

const ARTICLE = /^(?:(le|la|un|une)\s+|(l'))(.+)$/i;
export function articleFill(vocab: VocabItem[]): Question[] {
  const out: Question[] = [];
  for (const v of vocab.filter(usableVocab)) {
    if (v.category === 'artigos') continue;
    const m = ARTICLE.exec(v.fr);
    if (!m || /[()/…?]/.test(v.fr)) continue;
    const art = (m[1] ?? m[2])!;
    const rest = m[3]!;
    if (
      /\s(de|d')\s|^(avoir|être)/i.test(v.fr) &&
      art.toLowerCase() !== 'un' &&
      art.toLowerCase() !== 'une'
    )
      continue;
    if (!/^(o|a|um|uma)\s/i.test(v.pt)) continue;
    out.push(
      mk({
        id: `q-art-${v.id}`,
        unit: v.unit,
        type: 'fill_blank',
        skill: 'gramatica',
        concept: `v:${v.id}`,
        prompt: `Complete com o artigo: _______ ${rest} (${v.pt})`,
        answers: [art.toLowerCase() === "l'" ? "l'" : art.toLowerCase()],
        explanation: `${v.fr} (${v.pt}). Antes de vogal ou h, o artigo definido vira l'.`,
        error_tags: ['artigo_definido_indefinido'],
        difficulty: 1,
      }),
    );
  }
  return out;
}

export function femininePairs(vocab: VocabItem[]): Question[] {
  const out: Question[] = [];
  for (const v of vocab.filter(
    (x) => x.category === 'feminino' && !x.needs_review && x.fr.includes(' / '),
  )) {
    const [m, f] = v.fr.split(' / ') as [string, string];
    if (!m || !f || m === f) continue;
    const slug = ascii(m);
    out.push(
      mk({
        id: `q-fem-${slug}`,
        unit: v.unit,
        type: 'fill_blank',
        skill: 'gramatica',
        concept: `fem:${slug}`,
        prompt: `Passe para o feminino: ${m}`,
        answers: [f],
        explanation: `${m} no feminino é ${f} (${v.pt}).`,
        error_tags: ['concordancia_feminino'],
        difficulty: 2,
      }),
    );
    out.push(
      mk({
        id: `q-mas-${slug}`,
        unit: v.unit,
        type: 'fill_blank',
        skill: 'gramatica',
        concept: `fem:${slug}`,
        prompt: `Passe para o masculino: ${f}`,
        answers: [m],
        explanation: `${f} no masculino é ${m} (${v.pt}).`,
        error_tags: ['concordancia_feminino'],
        difficulty: 2,
      }),
    );
  }
  return out;
}

/** Ligar pares: blocos de 4 de cada categoria, em ordem estável. */
export function matchSets(vocab: VocabItem[]): Question[] {
  const out: Question[] = [];
  const cats = [...new Set(vocab.filter(usableVocab).map((v) => `${v.unit}|${v.category}`))];
  for (const key of cats) {
    const [unit, cat] = key.split('|') as [string, string];
    const items = vocab.filter(
      (v) =>
        usableVocab(v) &&
        v.unit === unit &&
        v.category === cat &&
        !/[…?]/.test(v.fr) &&
        v.pt.length < 40,
    );
    // evita pares com a mesma tradução, que tornariam a questão ambígua
    const uniq = items.filter(
      (v, i) => items.findIndex((o) => basePt(o.pt) === basePt(v.pt)) === i,
    );
    const total = Math.floor(uniq.length / 4);
    for (let k = 0; k + 4 <= uniq.length; k += 4) {
      const set = uniq.slice(k, k + 4);
      out.push(
        mk({
          id: `q-mpr-${unit}-${ascii(cat)}-${k / 4 + 1}`,
          unit,
          type: 'match_pairs',
          skill: 'vocabulario',
          concept: `mp:${unit}:${cat}:${k / 4}`,
          prompt: `Ligue cada palavra à tradução (${categoryLabel(cat)}${total > 1 ? `, parte ${k / 4 + 1}` : ''}).`,
          answers: [],
          pairs: set.map((v) => ({ left: v.fr, right: v.pt })),
          explanation: set.map((v) => `${v.fr} = ${v.pt}`).join('; ') + '.',
          error_tags: [`vocabulario_${cat}`],
          difficulty: 1,
        }),
      );
    }
  }
  return out;
}

// ---------- frases ----------
const wc = (s: string) => s.split(/\s+/).length;
const stripP = (w: string) => w.replace(/^[«"(]+|[».,;:!?")]+$/g, '');

export function phraseExercises(phrases: Phrase[]): Question[] {
  const out: Question[] = [];
  const seenFr = new Set<string>();
  for (const p of phrases.filter((x) => !x.needs_review)) {
    if (seenFr.has(p.fr)) continue;
    seenFr.add(p.fr);
    const n = wc(p.fr);
    const common = { unit: p.unit, concept: `ph:${p.id}` };
    // tradução
    if (n >= 2 && !/[()]/.test(p.fr)) {
      out.push(
        mk({
          ...common,
          id: `q-trp-${p.id}`,
          type: 'translate_pt_fr',
          skill: 'vocabulario',
          prompt: `Traduza para o francês: ${p.pt}`,
          answers: [p.fr],
          explanation: `${p.fr} (${p.pt})${p.pron ? ` Pronúncia: (${p.pron})` : ''}`,
          error_tags: [`frases_${p.unit}`],
          difficulty: n > 6 ? 3 : 2,
        }),
      );
    }
    // ordenar
    if (n >= 3 && n <= 10 && !/[()]/.test(p.fr)) {
      const joined = p.fr.replace(/\s+([?!])/g, '$1');
      const words = joined.split(/\s+/);
      out.push(
        mk({
          ...common,
          id: `q-ord-${p.id}`,
          type: 'order_words',
          skill: 'gramatica',
          prompt: `Coloque as palavras na ordem: "${p.pt}"`,
          answers: [joined, p.fr],
          words: scrambled(words, p.id),
          explanation: `${p.fr} (${p.pt})`,
          error_tags: ['ordem_palavras'],
          difficulty: 2,
        }),
      );
    }
    // ditado e fala
    if (n >= 2 && n <= 10 && !/[()]/.test(p.fr)) {
      out.push(
        mk({
          ...common,
          id: `q-dic-${p.id}`,
          type: 'dictation',
          skill: 'escuta',
          prompt: 'Ouça e escreva o que você ouviu.',
          answers: [p.fr],
          audio_text: p.fr,
          hint: `Situação: ${p.situation}`,
          explanation: `${p.fr} (${p.pt})`,
          error_tags: [`escuta_${p.unit}`],
          difficulty: 2,
        }),
      );
      out.push(
        mk({
          ...common,
          id: `q-spk-${p.id}`,
          type: 'speak',
          skill: 'fala',
          prompt: 'Ouça o modelo e repita a frase.',
          answers: [p.fr],
          audio_text: p.fr,
          hint: p.pron ? `Pronúncia: (${p.pron})` : undefined,
          explanation: `${p.fr} (${p.pt})`,
          error_tags: [`fala_${p.unit}`],
          difficulty: 2,
        }),
      );
    }
    // lacuna: até 2 palavras de conteúdo por frase
    const tokens = p.fr.split(/\s+/);
    const cands = tokens
      .map((t, i) => ({ t, i, w: stripP(t) }))
      .filter(({ w }) => w.length >= 4 && !/['’]/.test(w) && /^[\p{L}-]+$/u.test(w));
    const chosen = shuffled(cands, `clz:${p.id}`)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i);
    chosen.forEach((c, k) => {
      const masked = tokens.map((t, i) => (i === c.i ? t.replace(c.w, '_______') : t)).join(' ');
      out.push(
        mk({
          ...common,
          id: `q-clz-${p.id}-${k + 1}`,
          type: 'fill_blank',
          skill: 'gramatica',
          concept: `ph:${p.id}`,
          prompt: `Complete a frase: ${masked} (${p.pt})`,
          answers: [c.w],
          explanation: `${p.fr} (${p.pt})`,
          error_tags: [`frases_${p.unit}`],
          difficulty: 2,
        }),
      );
    });
  }
  return out;
}

// ---------- números e horas (regras do e-book; source "generated") ----------
export function numberExercises(): Question[] {
  const out: Question[] = [];
  for (let n = 1; n <= 99; n++) {
    const w = numberToFrench(n);
    if (!w) continue;
    const diff = n < 20 ? 1 : n < 70 ? 2 : 3;
    const rule =
      n >= 81
        ? 'O 80 é 4x20: quatre-vingt + o número.'
        : n >= 70
          ? 'O 70 é 60+10: soixante + o número.'
          : 'Dezena + hífen + unidade (e "et un" no 21, 31, 41, 51, 61).';
    out.push(
      mk({
        id: `q-numw-${n}`,
        unit: 'u03',
        type: 'write_out',
        skill: 'vocabulario',
        concept: `num:${n}`,
        prompt: `Escreva por extenso em francês: ${n}`,
        answers: [w],
        explanation: `${n} = ${w}. ${n >= 20 ? rule : ''}`.trim(),
        error_tags: ['numeros'],
        difficulty: diff as 1 | 2 | 3,
        source: 'generated',
      }),
    );
    out.push(
      mk({
        id: `q-numd-${n}`,
        unit: 'u03',
        type: 'write_out',
        skill: 'vocabulario',
        concept: `num:${n}`,
        prompt: `Escreva em algarismos: ${w}`,
        answers: [String(n)],
        explanation: `${w} = ${n}. ${n >= 20 ? rule : ''}`.trim(),
        error_tags: ['numeros'],
        difficulty: diff as 1 | 2 | 3,
        source: 'generated',
      }),
    );
  }
  return out;
}

/**
 * Respostas aceitas para uma hora: a forma do relógio de 12 horas (a do e-book, com e sem "Il est") e, para os horários oficiais,
 * a leitura de 24 horas (hora + minutos, como "dix-huit heures quinze"). Pula 0h, 1h e 21h, em que a concordância (une, vingt et une) não está no e-book.
 */
function hourAnswers(h: number, m: number, w: string): string[] {
  const out = [w, `Il est ${w}`];
  if (h !== 0 && h !== 1 && h !== 21) {
    const hw = numberToFrench(h);
    const mw = m === 0 ? '' : numberToFrench(m);
    if (hw && mw !== null) {
      const official = `${hw} heures${mw ? ` ${mw}` : ''}`;
      if (!out.includes(official)) out.push(official, `Il est ${official}`);
    }
  }
  return out;
}

export function timeExercises(): Question[] {
  const out: Question[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) {
      const w = timeToFrench(h, m);
      if (!w) continue;
      // metade das combinações, em ordem estável, para não dominar o banco
      if (m !== 0 && hash(`hr:${h}:${m}`) % 2 === 0) continue;
      const hh = `${h}h${m === 0 ? '' : String(m).padStart(2, '0')}`;
      out.push(
        mk({
          id: `q-hr-${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`,
          unit: 'u08',
          type: 'write_out',
          skill: 'vocabulario',
          concept: `hr:${h}:${m}`,
          prompt: `Escreva a hora por extenso: ${hh}`,
          answers: hourAnswers(h, m, w),
          explanation: `${hh} = ${w}. Até 30 minutos some os minutos; depois de 30, diminua da próxima hora (moins). No dia a dia fala-se no relógio de 12 horas.`,
          error_tags: ['horas'],
          difficulty: m === 0 ? 1 : m % 15 === 0 ? 2 : 3,
          source: 'generated',
        }),
      );
    }
  }
  return out;
}

// ---------- conjugações: todos os verbos, tempos e pessoas ----------
const UNIT_OF_PRESENT: Record<string, string | null> = {
  etre: 'u01',
  avoir: 'u05',
  faire: 'u05',
  aller: 'u05',
};
export function conjugationExercises(conjs: Conjugation[]): Question[] {
  const out: Question[] = [];
  for (const c of conjs) {
    const base = ascii(c.verb);
    const irregular = [
      'etre',
      'avoir',
      'aller',
      'faire',
      'boire',
      'dire',
      'voir',
      'vouloir',
      'mettre',
    ].includes(base);
    for (const tense of PRACTICE_TENSES) {
      const row = PERSONS.map((p) => c.tenses[tense][p]).join(', ');
      for (const p of PERSONS) {
        const { subject, form } = splitSubject(c.tenses[tense][p]);
        const label = {
          present: 'présent',
          futur_proche: 'futur proche',
          passe_compose: 'passé composé',
          imparfait: 'imparfait',
          futur_simple: 'futur simple',
        }[tense];
        out.push(
          mk({
            id: `q-conj-${base}-${tense}-${p}`
              .replace('futur_', 'futur-')
              .replace('passe_', 'passe-'),
            unit: tense === 'present' ? (UNIT_OF_PRESENT[base] ?? null) : null,
            type: 'conjugate',
            skill: 'gramatica',
            concept: `conj:${base}:${tense}:${p}`,
            prompt: `Conjugue ${c.verb} (${c.pt}) no ${label}: ${subject}_____`,
            answers: [form],
            explanation: `${label[0]!.toUpperCase()}${label.slice(1)} de ${c.verb}: ${row}.`,
            error_tags: [
              ['etre', 'avoir', 'faire', 'aller'].includes(base)
                ? `conjugacao_${base}`
                : irregular
                  ? 'conjugacao_irregular'
                  : 'conjugacao_regular',
            ],
            // être e avoir abrem o e-book (nível 1); faire e aller vêm depois (2); os demais verbos só aparecem na tabela do fim (3)
            difficulty: ['etre', 'avoir'].includes(base)
              ? 1
              : ['faire', 'aller'].includes(base)
                ? 2
                : 3,
          }),
        );
      }
    }
  }
  return out;
}
