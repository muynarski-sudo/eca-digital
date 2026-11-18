import { z } from 'zod';

export const SOURCES = ['ebook', 'generated'] as const;
export const SKILLS = ['vocabulario', 'gramatica', 'escuta', 'fala'] as const;
export const QUESTION_TYPES = [
  'fill_blank',
  'multiple_choice',
  'translate_pt_fr',
  'order_words',
  'match_pairs',
  'write_out',
  'conjugate',
  'dictation',
  'speak',
] as const;
export const TENSES = [
  'present',
  'futur_proche',
  'passe_compose',
  'imparfait',
  'futur_simple',
] as const;
/**
 * Tempos que o e-book ensina nos capítulos (présent). Os demais aparecem só na tabela de conjugações do fim do e-book
 * (referência) e não viram exercício até o e-book ensiná-los.
 */
export const PRACTICE_TENSES = ['present'] as const;

/** Assuntos para filtrar a prática. */
export const TOPICS = [
  'apresentacao',
  'dia_a_dia',
  'viagem',
  'restaurante',
  'compras',
  'trabalho',
  'horario',
  'calendario',
  'numeros',
  'localizacao',
  'pronuncia',
  'gramatica',
] as const;
export type Topic = (typeof TOPICS)[number];

/** Níveis do Quadro Europeu (CEFR). O e-book cobre o A1; os demais são conteúdo extra gerado (revisar). */
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Cefr = (typeof CEFR)[number];
/** Onde a questão aparece: trilha do e-book, ou as áreas de leitura, gramática e vocabulário por nível. */
export const TRACKS = ['trilha', 'leitura', 'gramatica', 'vocabulario'] as const;
export type Track = (typeof TRACKS)[number];

export const PERSONS = ['je', 'tu', 'il', 'nous', 'vous', 'ils'] as const;

const id = z.string().regex(/^[a-z0-9][a-z0-9_.-]*$/i);
const meta = {
  source: z.enum(SOURCES),
  needs_review: z.boolean().default(false),
};

export const unitSchema = z.object({
  id,
  level: z.string().default('A1'),
  order: z.number().int().positive(),
  chapter: z.number().int().positive().optional(),
  title: z.string().min(1),
  objective: z.string().min(1),
  summary: z.string().min(1),
});

export const vocabSchema = z.object({
  id,
  unit: id,
  category: z.string().min(1),
  fr: z.string().min(1),
  pt: z.string().min(1),
  pron: z.string().optional(),
  example: z.object({ fr: z.string(), pt: z.string() }).optional(),
  /** Nível da trilha em que a palavra é estudada (src/lib/content/stages.ts). */
  stage: z.string().optional(),
  ...meta,
});

export const questionSchema = z
  .object({
    id,
    unit: id.nullable(),
    type: z.enum(QUESTION_TYPES),
    skill: z.enum(SKILLS),
    prompt: z.string().min(1),
    /** Primeira resposta é a oficial; as demais são variantes aceitas. */
    answers: z.array(z.string().min(1)).default([]),
    choices: z.array(z.string()).optional(),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
    words: z.array(z.string()).optional(),
    audio_text: z.string().optional(),
    /** Ponto de conteúdo que a questão treina. Questões com o mesmo concept são variações uma da outra. */
    concept: z.string().min(1).optional(),
    hint: z.string().optional(),
    explanation: z.string().min(1),
    error_tags: z.array(z.string()).default([]),
    /** 1 = iniciante (reconhecer), 2 = intermediário (lembrar e escrever), 3 = avançado (frases e formas menos comuns). */
    difficulty: z.number().int().min(1).max(3),
    topic: z.enum(TOPICS).default('dia_a_dia'),
    track: z.enum(TRACKS).default('trilha'),
    /** Nível da trilha (um assunto só): ver src/lib/content/stages.ts. */
    stage: z.string().optional(),
    /** Nível CEFR das áreas de leitura, gramática e vocabulário. */
    cefr: z.enum(CEFR).optional(),
    /** Leitura: id do texto a que a pergunta pertence. */
    reading: id.optional(),
    ...meta,
  })
  .superRefine((q, ctx) => {
    const needsAnswers = q.type !== 'match_pairs';
    if (needsAnswers && q.answers.length === 0)
      ctx.addIssue({ code: 'custom', message: 'answers vazio' });
    if (q.type === 'multiple_choice') {
      if (!q.choices || q.choices.length < 2)
        ctx.addIssue({ code: 'custom', message: 'choices < 2' });
      else if (!q.choices.includes(q.answers[0] ?? ''))
        ctx.addIssue({ code: 'custom', message: 'resposta fora das choices' });
    }
    if (q.type === 'match_pairs' && (!q.pairs || q.pairs.length < 2))
      ctx.addIssue({ code: 'custom', message: 'pairs < 2' });
    if (q.type === 'order_words' && (!q.words || q.words.length < 2))
      ctx.addIssue({ code: 'custom', message: 'words < 2' });
    if ((q.type === 'dictation' || q.type === 'speak') && !q.audio_text)
      ctx.addIssue({ code: 'custom', message: 'audio_text obrigatório' });
  });

const personForms = z.object(
  Object.fromEntries(PERSONS.map((p) => [p, z.string().min(1)])) as Record<
    (typeof PERSONS)[number],
    z.ZodString
  >,
);
export const conjugationSchema = z.object({
  id,
  verb: z.string().min(1),
  pt: z.string().min(1),
  tenses: z.object(
    Object.fromEntries(TENSES.map((t) => [t, personForms])) as Record<
      (typeof TENSES)[number],
      typeof personForms
    >,
  ),
  ...meta,
});

export const dialogueSchema = z.object({
  id,
  unit: id,
  title: z.string(),
  scene: z.string().optional(),
  lines: z
    .array(
      z.object({
        speaker: z.string(),
        fr: z.string(),
        pt: z.string(),
        pron: z.string().optional(),
      }),
    )
    .min(2),
  ...meta,
});

export const phraseSchema = z.object({
  id,
  unit: id,
  situation: z.string().min(1),
  fr: z.string().min(1),
  pt: z.string().min(1),
  pron: z.string().optional(),
  stage: z.string().optional(),
  ...meta,
});

/** Texto de leitura por nível (estilo lingua.com): texto, áudio e perguntas de compreensão (que ficam em questions.json). */
export const readingSchema = z.object({
  id,
  level: z.enum(CEFR),
  title: z.string().min(1),
  title_pt: z.string().min(1),
  /** Um parágrafo por item. O áudio lê todos em ordem. */
  paragraphs: z.array(z.string().min(1)).min(1),
  ...meta,
});

/** Palavra solta de um nível, para o exercício de vocabulário (as do A1 vêm do vocabulário do e-book). */
export const lexiconSchema = z.object({
  id,
  level: z.enum(CEFR),
  fr: z.string().min(1),
  pt: z.string().min(1),
  ...meta,
});

export const cultureSchema = z.object({
  id,
  unit: id,
  title: z.string(),
  text: z.string(),
  ...meta,
});

export type Unit = z.infer<typeof unitSchema>;
export type VocabItem = z.infer<typeof vocabSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Conjugation = z.infer<typeof conjugationSchema>;
export type Dialogue = z.infer<typeof dialogueSchema>;
export type Phrase = z.infer<typeof phraseSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type LexiconItem = z.infer<typeof lexiconSchema>;
export type CultureTip = z.infer<typeof cultureSchema>;
export type Person = (typeof PERSONS)[number];
export type Tense = (typeof TENSES)[number];

export const contentSchemas = {
  'units.json': z.array(unitSchema),
  'vocab.json': z.array(vocabSchema),
  'questions.json': z.array(questionSchema),
  'conjugations.json': z.array(conjugationSchema),
  'dialogues.json': z.array(dialogueSchema),
  'phrases.json': z.array(phraseSchema),
  'culture.json': z.array(cultureSchema),
  'readings.json': z.array(readingSchema),
  'lexicon.json': z.array(lexiconSchema),
} as const;
