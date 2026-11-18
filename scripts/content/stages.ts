/* Define a qual nível (etapa) da trilha cada questão pertence, só pela estrutura do e-book. Um assunto por nível. */
import type { Phrase, Question, VocabItem } from '../../src/lib/content/schema';

const UNIT_RANGE = (n: number, ranges: Array<[number, number, string]>) =>
  ranges.find(([a, b]) => n >= a && n <= b)?.[2];

/** Exercícios do gabarito do e-book (q-uNN-NNN). */
function ebookStage(id: string): string | null {
  const m = /^q-u(\d\d)-(\d{3})$/.exec(id);
  if (!m) return null;
  const u = Number(m[1]);
  const n = Number(m[2]);
  switch (u) {
    case 1:
      return 'verbo-etre';
    case 3:
      return (
        UNIT_RANGE(n, [
          [1, 2, 'pedidos-compras'],
          [3, 6, 'viagem'],
          [7, 18, 'numeros-1'],
        ]) ?? null
      );
    case 4:
      return (
        UNIT_RANGE(n, [
          [1, 5, 'negativa'],
          [6, 8, 'interrogativas'],
          [9, 9, 'negativa'],
        ]) ?? null
      );
    case 5:
      return (
        UNIT_RANGE(n, [
          [1, 5, 'verbo-avoir'],
          [6, 8, 'verbo-faire'],
          [9, 13, 'verbos-frases'],
        ]) ?? null
      );
    case 6:
      return 'feminino-plural';
    case 7:
      return (
        UNIT_RANGE(n, [
          [1, 5, 'artigos'],
          [6, 14, 'contracoes'],
          [15, 26, 'possessivos'],
          [27, 32, 'demonstrativos'],
        ]) ?? null
      );
    case 8:
      return (
        UNIT_RANGE(n, [
          [1, 6, 'dias-meses'],
          [7, 15, 'horas-1'],
          [16, 24, 'estacoes-clima'],
        ]) ?? null
      );
    case 9:
      return 'localizacao';
    case 10:
      return (
        UNIT_RANGE(n, [
          [1, 1, 'restaurante'],
          [2, 2, 'aeroporto-direcoes'],
          [3, 3, 'emergencias'],
          [4, 4, 'aeroporto-direcoes'],
          [5, 5, 'emergencias'],
          [6, 6, 'aeroporto-direcoes'],
        ]) ?? null
      );
    default:
      return null;
  }
}

/** Número que a questão trabalha (1 a 99), pelo conceito ou pelo enunciado. */
function numberOf(q: Question): number | null {
  const c = /^num:(\d+)$/.exec(q.concept ?? '');
  if (c) return Number(c[1]);
  const p = /:\s*(\d+)$/.exec(q.prompt);
  return p ? Number(p[1]) : null;
}
const numberStage = (n: number | null) =>
  n === null
    ? 'numeros-1'
    : n <= 19
      ? 'numeros-1'
      : n <= 49
        ? 'numeros-2'
        : n <= 69
          ? 'numeros-3'
          : 'numeros-4';

/** Minutos da hora que a questão trabalha, pelo id (q-hr-HHMM) ou pelo enunciado ("10h15"). */
function minutesOf(q: Question): number {
  const id = /^q-hr-\d\d(\d\d)$/.exec(q.id);
  if (id) return Number(id[1]);
  const p = /(\d{1,2})h(\d{2})?$/.exec(q.prompt);
  return p?.[2] ? Number(p[2]) : 0;
}
const hourStage = (m: number) =>
  m === 0 ? 'horas-1' : [15, 30, 45].includes(m) ? 'horas-2' : 'horas-3';

export function vocabStage(v: Pick<VocabItem, 'id' | 'category'>): string | null {
  const n = Number(/(\d{3})$/.exec(v.id)?.[1] ?? 0);
  switch (v.category) {
    case 'saudacoes':
      return n <= 5 ? 'saudacoes' : n <= 12 ? 'despedidas' : 'apresentacao';
    case 'descricoes':
      return 'apresentacao';
    case 'pronomes':
      return 'pronomes';
    case 'ille_tion':
    case 'pronuncia_r':
    case 'vogais_juntas':
    case 'vogais_nasais':
    case 'alfabeto':
      return 'pronuncia';
    case 'cortesia':
      return 'cortesia';
    case 'numeros':
      return 'numeros-1';
    case 'viagem':
      return 'viagem';
    case 'interrogativas':
      return 'interrogativas';
    case 'ligacao':
      return 'negativa';
    case 'verbos':
      return 'verbos-frases';
    case 'expressoes_avoir':
      return 'expressoes-avoir';
    case 'feminino':
      return 'feminino-plural';
    case 'artigos':
      return 'artigos';
    case 'possessivos':
      return 'possessivos';
    case 'demonstrativos':
      return 'demonstrativos';
    case 'dias':
    case 'meses':
      return 'dias-meses';
    case 'horas':
      return 'horas-1';
    case 'estacoes':
    case 'clima':
      return 'estacoes-clima';
    case 'preposicoes_lugar':
    case 'expressoes':
      return 'localizacao';
    case 'aeroporto':
    case 'direcoes':
      return 'aeroporto-direcoes';
    case 'restaurante':
      return 'restaurante';
    case 'emergencias':
      return 'emergencias';
    default:
      return null;
  }
}

const PHRASE_BY_ID: Record<string, string> = {
  'ph-u01-001': 'saudacoes',
  'ph-u01-002': 'saudacoes',
  'ph-u01-003': 'apresentacao',
  'ph-u01-004': 'apresentacao',
  'ph-u01-005': 'apresentacao',
  'ph-u01-006': 'verbo-etre',
  'ph-u01-007': 'cortesia',
  'ph-u02-008': 'pronuncia',
  'ph-u02-009': 'pronuncia',
  'ph-u02-010': 'pronuncia',
  'ph-u03-011': 'pedidos-compras',
  'ph-u03-014': 'pedidos-compras',
  'ph-u03-015': 'pedidos-compras',
  'ph-u03-016': 'pedidos-compras',
  'ph-u03-017': 'pedidos-compras',
  'ph-u07-035': 'contracoes',
  'ph-u07-036': 'contracoes',
};
const PHRASE_BY_SITUATION: Record<string, string> = {
  'Pedindo informações': 'viagem',
  'No hotel': 'viagem',
  'Na estação': 'viagem',
  'No táxi': 'viagem',
  Transporte: 'viagem',
  Perguntar: 'interrogativas',
  Negar: 'negativa',
  'Dia a dia': 'verbos-frases',
  Horas: 'horas-1',
  Clima: 'estacoes-clima',
  Localização: 'localizacao',
  Aeroporto: 'aeroporto-direcoes',
  Direções: 'aeroporto-direcoes',
  Restaurante: 'restaurante',
  Emergência: 'emergencias',
};
export const phraseStage = (p: Pick<Phrase, 'id' | 'situation'>): string | null =>
  PHRASE_BY_ID[p.id] ?? PHRASE_BY_SITUATION[p.situation] ?? null;

const VERB_STAGE: Record<string, string> = {
  etre: 'verbo-etre',
  avoir: 'verbo-avoir',
  faire: 'verbo-faire',
  aller: 'verbo-aller',
};

export function assignStages(
  questions: Question[],
  vocab: VocabItem[],
  phrases: Phrase[],
): Question[] {
  const vById = new Map(vocab.map((v) => [v.id, v]));
  const pById = new Map(phrases.map((p) => [p.id, p]));
  return questions.map((q) => {
    if ((q.track ?? 'trilha') !== 'trilha') return q;
    const key = `${q.id} ${q.concept ?? ''}`;
    let stage: string | null = ebookStage(q.id);
    if (!stage) {
      const ph = /ph-u\d\d-\d{3}/.exec(key)?.[0];
      const vo = /v-u\d\d-\d{3}/.exec(key)?.[0];
      const mp = /^mp:([a-z0-9-]+):/.exec(q.concept ?? '');
      const conj = /^q-conj-([a-z]+)-present-/.exec(q.id)?.[1];
      if (q.id.startsWith('q-numw') || q.id.startsWith('q-numd')) stage = numberStage(numberOf(q));
      else if (q.id.startsWith('q-hr-')) stage = hourStage(minutesOf(q));
      else if (conj) stage = VERB_STAGE[conj] ?? 'mais-verbos';
      else if (/^q-(fem|mas)-/.test(q.id)) stage = 'feminino-plural';
      else if (ph && pById.has(ph)) stage = phraseStage(pById.get(ph)!);
      else if (vo && vById.has(vo)) stage = vocabStage(vById.get(vo)!);
      else if (mp) {
        stage = mp[1]!; // o conjunto de pares já nasce dentro de um nível só
      }
    }
    if (stage === 'numeros-1' && q.id.startsWith('q-u03-')) stage = numberStage(numberOf(q));
    if (stage === 'horas-1' && q.id.startsWith('q-u08-')) stage = hourStage(minutesOf(q));
    return { ...q, stage: stage ?? undefined };
  });
}
