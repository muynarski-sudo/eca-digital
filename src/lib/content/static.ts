import conjugationsJson from '../../../content/data/conjugations.json';
import phrasesJson from '../../../content/data/phrases.json';
import dialoguesJson from '../../../content/data/dialogues.json';
import cultureJson from '../../../content/data/culture.json';
import readingsJson from '../../../content/data/readings.json';
import {
  contentSchemas,
  PERSONS,
  TENSES,
  type Conjugation,
  type Person,
  type Tense,
} from './schema';
import { splitSubject } from './conjugation';

/** Conteúdo estático empacotado no build (conjugações, frases, diálogos, dicas). Questões e vocabulário vêm do banco. */
export const conjugations: Conjugation[] =
  contentSchemas['conjugations.json'].parse(conjugationsJson);
export const phrases = contentSchemas['phrases.json']
  .parse(phrasesJson)
  .filter((p) => !p.needs_review);
export const dialogues = contentSchemas['dialogues.json']
  .parse(dialoguesJson)
  .filter((d) => !d.needs_review);
export const readings = contentSchemas['readings.json']
  .parse(readingsJson)
  .filter((r) => !r.needs_review);
export const cultureTips = contentSchemas['culture.json']
  .parse(cultureJson)
  .filter((c) => !c.needs_review);

export const conjugationId = (verbId: string, tense: Tense, person: Person) =>
  `conj:${verbId}:${tense}:${person}`;

export interface ConjugationItem {
  id: string;
  verb: string;
  pt: string;
  tense: Tense;
  person: Person;
  subject: string;
  /** resposta oficial: a forma sem o pronome */
  answer: string;
  full: string;
}

export function parseConjugationId(id: string): ConjugationItem | null {
  const m = /^conj:([a-z0-9-]+):([a-z_]+):([a-z]+)$/.exec(id);
  if (!m) return null;
  const [, verbId, tense, person] = m as unknown as [string, string, Tense, Person];
  const c = conjugations.find((x) => x.id === verbId);
  if (!c || !TENSES.includes(tense) || !PERSONS.includes(person)) return null;
  const full = c.tenses[tense][person];
  const { subject, form } = splitSubject(full);
  return { id, verb: c.verb, pt: c.pt, tense, person, subject, answer: form, full };
}
