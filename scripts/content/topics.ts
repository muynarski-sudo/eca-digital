/* Classificação por assunto. Só usa a estrutura do e-book (capítulo, categoria do vocabulário e situação das frases),
   sem inventar conteúdo. Revise os assuntos em content/REVIEW.md se mudar o critério. */
import { vocabStage } from './stages';
import type { Phrase, Question, Topic, VocabItem } from '../../src/lib/content/schema';

/** Profissões que o e-book ensina (capítulos 1 e 6). */
const PROFESSION_VOCAB = new Set([
  'v-u01-027', // professeur
  'v-u06-006', // professeur
  'v-u06-010', // infirmier
  'v-u06-012', // serveur
  'v-u06-014', // acteur
  'v-u06-015', // éditeur
  'v-u06-016', // chanteur
  'v-u06-020', // boulanger
  'v-u06-021', // musicien
  'v-u06-022', // danseur
]);
const PROFESSION_WORDS = [
  'infirmier',
  'serveur',
  'acteur',
  'editeur',
  'chanteur',
  'boulanger',
  'musicien',
  'danseur',
  'professeur',
];

export function vocabTopic(v: Pick<VocabItem, 'id' | 'category'>): Topic {
  if (PROFESSION_VOCAB.has(v.id)) return 'trabalho';
  switch (v.category) {
    case 'saudacoes':
    case 'pronomes':
    case 'descricoes':
      return 'apresentacao';
    case 'alfabeto':
    case 'ille_tion':
    case 'pronuncia_r':
    case 'vogais_juntas':
    case 'vogais_nasais':
      return 'pronuncia';
    case 'cortesia':
    case 'interrogativas':
    case 'ligacao':
    case 'expressoes_avoir':
      return 'dia_a_dia';
    case 'numeros':
      return 'numeros';
    case 'viagem':
    case 'aeroporto':
    case 'direcoes':
    case 'emergencias':
      return 'viagem';
    case 'restaurante':
      return 'restaurante';
    case 'horas':
      return 'horario';
    case 'dias':
    case 'meses':
    case 'estacoes':
    case 'clima':
      return 'calendario';
    case 'preposicoes_lugar':
    case 'expressoes':
      return 'localizacao';
    default:
      return 'gramatica'; // verbos, feminino, artigos, possessivos, demonstrativos
  }
}

const PHRASE_BY_SITUATION: Record<string, Topic> = {
  Cumprimentar: 'apresentacao',
  'Apresentar-se': 'apresentacao',
  'Pedir ajuda': 'dia_a_dia',
  'Praticar pronúncia': 'pronuncia',
  'No café': 'restaurante',
  'No restaurante': 'restaurante',
  'Pedir comida': 'restaurante',
  Restaurante: 'restaurante',
  Compras: 'compras',
  'Pedindo informações': 'viagem',
  'No hotel': 'viagem',
  'Na estação': 'viagem',
  'No táxi': 'viagem',
  Transporte: 'viagem',
  Aeroporto: 'viagem',
  Emergência: 'viagem',
  Direções: 'viagem',
  Perguntar: 'dia_a_dia',
  Negar: 'dia_a_dia',
  'Dia a dia': 'dia_a_dia',
  Horas: 'horario',
  Clima: 'calendario',
  Localização: 'localizacao',
};
/** Exceções em que a frase pertence a outro assunto que o da sua situação. */
const PHRASE_OVERRIDE: Record<string, Topic> = {
  'ph-u03-015': 'compras', // "quanto custa, por favor?" (preço)
  'ph-u05-032': 'compras', // "fazemos compras no mercado"
  'ph-u05-030': 'restaurante', // "tenho fome, onde é o restaurante?"
  'ph-u04-029': 'apresentacao', // "ele é brasileiro, mas mora na França"
  'ph-u02-009': 'dia_a_dia',
  'ph-u02-010': 'viagem',
  'ph-u02-008': 'apresentacao',
};
export function phraseTopic(p: Pick<Phrase, 'id' | 'situation'>): Topic {
  return PHRASE_OVERRIDE[p.id] ?? PHRASE_BY_SITUATION[p.situation] ?? 'dia_a_dia';
}

/** Exercícios do gabarito do e-book (q-uNN-NNN): assunto pelo capítulo, com exceções pelo número. */
function ebookTopic(id: string): Topic | null {
  const m = /^q-u(\d\d)-(\d{3})$/.exec(id);
  if (!m) return null;
  const u = Number(m[1]);
  const n = Number(m[2]);
  switch (u) {
    case 1:
      return 'apresentacao';
    case 3:
      return n <= 2 ? 'restaurante' : n <= 6 ? 'viagem' : 'numeros';
    case 4:
      return 'gramatica';
    case 5:
      return n <= 8 ? 'gramatica' : n === 13 ? 'apresentacao' : 'dia_a_dia';
    case 6:
      return n <= 9 ? 'trabalho' : 'gramatica';
    case 7:
      return 'gramatica';
    case 8:
      return n >= 7 && n <= 15 ? 'horario' : 'calendario';
    case 9:
      return 'localizacao';
    case 10:
      return n === 1 ? 'restaurante' : 'viagem';
    default:
      return null;
  }
}

export function assignTopics(
  questions: Question[],
  vocab: VocabItem[],
  phrases: Phrase[],
): Question[] {
  const vById = new Map(vocab.map((v) => [v.id, v]));
  const pById = new Map(phrases.map((p) => [p.id, p]));
  return questions.map((q) => {
    if ((q.track ?? 'trilha') !== 'trilha') return q; // leitura, gramática e vocabulário por nível não usam os assuntos da trilha
    const key = `${q.id} ${q.concept ?? ''}`;
    let topic: Topic | null = ebookTopic(q.id);
    if (!topic) {
      const ph = /ph-u\d\d-\d{3}/.exec(key)?.[0];
      const vo = /v-u\d\d-\d{3}/.exec(key)?.[0];
      const mp = /^mp:([a-z0-9-]+):/.exec(q.concept ?? '');
      if (q.id.startsWith('q-numw') || q.id.startsWith('q-numd')) topic = 'numeros';
      else if (q.id.startsWith('q-hr-')) topic = 'horario';
      else if (q.id.startsWith('q-conj-')) topic = 'gramatica';
      else if (/^q-(fem|mas)-/.test(q.id))
        topic = PROFESSION_WORDS.some((w) => q.id.endsWith(`-${w}`)) ? 'trabalho' : 'gramatica';
      else if (ph && pById.has(ph)) topic = phraseTopic(pById.get(ph)!);
      else if (vo && vById.has(vo)) topic = vocabTopic(vById.get(vo)!);
      else if (mp) {
        const sample = vocab.find((v) => vocabStage(v) === mp[1]);
        topic = sample ? vocabTopic(sample) : null;
      }
    }
    return { ...q, topic: topic ?? 'dia_a_dia' };
  });
}
