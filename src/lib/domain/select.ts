import type { Verdict } from './grade';

/** Dados leves de uma questão, suficientes para sortear sem carregar o conteúdo todo. */
export interface QuestionMeta {
  id: string;
  unit: string | null;
  type: string;
  concept: string;
  difficulty: number;
  /** Assunto (viagem, restaurante...). Opcional para não quebrar chamadas antigas. */
  topic?: string;
}

export interface SeenInfo {
  count: number;
  lastAt: number;
  lastVerdict: Verdict;
}

export interface SelectInput {
  pool: QuestionMeta[];
  /** Questões que o aluno já respondeu alguma vez. */
  seen: Map<string, SeenInfo>;
  /** Última resposta do aluno em cada conceito (qualquer questão do conceito). */
  concepts: Map<string, { lastAt: number; lastVerdict: Verdict }>;
  size: number;
  rng: () => number;
  /** Peso de sorteio de cada questão (padrão 1). Serve para favorecer a unidade mais fraca. */
  weight?: (q: QuestionMeta) => number;
  /** Ids a evitar nesta sessão (por exemplo, o que está na tela). */
  exclude?: Set<string>;
}

/** Amostragem ponderada sem reposição (Efraimidis e Spirakis): chave = u^(1/peso). */
function weightedOrder<T>(items: T[], w: (x: T) => number, rng: () => number): T[] {
  return items
    .map((x) => ({ x, k: Math.pow(Math.max(rng(), 1e-12), 1 / Math.max(w(x), 1e-6)) }))
    .sort((a, b) => b.k - a.k)
    .map((o) => o.x);
}

/**
 * Sorteia questões sem repetir.
 *
 * Regras, em ordem de prioridade:
 * 1. Nunca devolve uma pergunta já respondida enquanto houver pergunta nova disponível no conjunto.
 * 2. Entre as novas, vêm primeiro as de um conceito em que a última resposta do aluno foi errada ou "quase":
 *    é o reforço, feito com uma pergunta diferente sobre o mesmo ponto, em vez de repetir a mesma.
 * 3. Depois as de conceitos ainda não vistos, e por último as de conceitos que ele já acertou.
 * 4. Só quando as novas acabam, recicla as já respondidas, começando pelas mais antigas (e as que errou).
 * 5. Em cada rodada, no máximo uma pergunta por conceito (relaxado só se faltar pergunta) e sem muitos tipos iguais em sequência.
 */
export function selectQuestions(input: SelectInput): string[] {
  const { pool, seen, concepts, size, rng } = input;
  const weight = input.weight ?? (() => 1);
  const eligible = pool.filter((q) => !input.exclude?.has(q.id));

  const unseen = eligible.filter((q) => !seen.has(q.id));
  const tier = (q: QuestionMeta): number => {
    const c = concepts.get(q.concept);
    if (!c) return 1;
    return c.lastVerdict === 'correct' ? 2 : 0;
  };
  const tiers: QuestionMeta[][] = [[], [], []];
  for (const q of unseen) tiers[tier(q)]!.push(q);

  const recycled = eligible
    .filter((q) => seen.has(q.id))
    .sort((a, b) => {
      const sa = seen.get(a.id)!;
      const sb = seen.get(b.id)!;
      const wa = sa.lastVerdict === 'correct' ? 1 : 0;
      const wb = sb.lastVerdict === 'correct' ? 1 : 0;
      return wa - wb || sa.lastAt - sb.lastAt;
    });
  // dentro do reciclado, embaralha em blocos de mesma "idade" aproximada para não virar sempre a mesma ordem
  const recycledTier = weightedOrder(
    recycled,
    (q) => weight(q) / (1 + (recycled.indexOf(q) / Math.max(1, recycled.length)) * 6),
    rng,
  );

  const ordered: QuestionMeta[] = [
    ...tiers.flatMap((t) => weightedOrder(t, weight, rng)),
    ...recycledTier,
  ];

  const picked: QuestionMeta[] = [];
  const usedConcepts = new Set<string>();
  for (const q of ordered) {
    if (picked.length >= size) break;
    if (usedConcepts.has(q.concept)) continue;
    picked.push(q);
    usedConcepts.add(q.concept);
  }
  if (picked.length < size) {
    const ids = new Set(picked.map((q) => q.id));
    for (const q of ordered) {
      if (picked.length >= size) break;
      if (!ids.has(q.id)) {
        picked.push(q);
        ids.add(q.id);
      }
    }
  }
  return spreadTypes(picked).map((q) => q.id);
}

/** Evita mais de duas questões seguidas do mesmo tipo, sem mudar quais foram escolhidas. */
export function spreadTypes(list: QuestionMeta[]): QuestionMeta[] {
  const rest = [...list];
  const out: QuestionMeta[] = [];
  while (rest.length) {
    const lastTwo = out.slice(-2);
    const blocked =
      lastTwo.length === 2 && lastTwo[0]!.type === lastTwo[1]!.type ? lastTwo[0]!.type : null;
    let idx = rest.findIndex((q) => q.type !== blocked);
    if (idx < 0) idx = 0;
    out.push(rest.splice(idx, 1)[0]!);
  }
  return out;
}
