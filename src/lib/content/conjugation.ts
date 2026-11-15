import type { Person, Tense } from './schema';

export const TENSE_LABELS: Record<Tense, string> = {
  present: 'Présent',
  futur_proche: 'Futur proche',
  passe_compose: 'Passé composé',
  imparfait: 'Imparfait',
  futur_simple: 'Futur simple',
};

export const PERSON_LABELS: Record<Person, string> = {
  je: 'je',
  tu: 'tu',
  il: 'il/elle/on',
  nous: 'nous',
  vous: 'vous',
  ils: 'ils/elles',
};

const PREFIXES: Array<[RegExp, string]> = [
  [/^il\/elle\/on\s+/i, 'il/elle/on '],
  [/^il\/elle\s+/i, 'il/elle '],
  [/^ils\/elles\s+/i, 'ils/elles '],
  [/^j'\s*/i, "j'"],
  [/^je\s+/i, 'je '],
  [/^tu\s+/i, 'tu '],
  [/^nous\s+/i, 'nous '],
  [/^vous\s+/i, 'vous '],
];

/** Separa o pronome sujeito da forma verbal: "j'ai été" -> { subject: "j'", form: "ai été" }. */
export function splitSubject(text: string): { subject: string; form: string } {
  const clean = text.replace(/\s+/g, ' ').trim();
  for (const [re, subject] of PREFIXES) {
    if (re.test(clean)) return { subject, form: clean.replace(re, '') };
  }
  return { subject: '', form: clean };
}
