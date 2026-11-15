import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Verdict } from '@/lib/domain/grade';
import type { SeenInfo } from '@/lib/domain/select';

export interface SeenData {
  seen: Map<string, SeenInfo>;
  concepts: Map<string, { lastAt: number; lastVerdict: Verdict }>;
}

/** O que o aluno já respondeu: por questão (para não repetir) e por conceito (para reforçar o que errou). */
export async function loadSeen(db: SupabaseClient, studentId: string): Promise<SeenData> {
  const seen = new Map<string, SeenInfo>();
  const concepts = new Map<string, { lastAt: number; lastVerdict: Verdict }>();
  const PAGE = 1000;
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await db
      .from('attempts')
      .select('question_id,verdict,concept,created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      question_id: string;
      verdict: Verdict;
      concept: string | null;
      created_at: string;
    }>;
    for (const r of rows) {
      const at = new Date(r.created_at).getTime();
      const cur = seen.get(r.question_id);
      // linhas vêm da mais nova para a mais antiga: a primeira de cada questão é a última resposta
      if (!cur) seen.set(r.question_id, { count: 1, lastAt: at, lastVerdict: r.verdict });
      else cur.count++;
      if (r.concept && !concepts.has(r.concept))
        concepts.set(r.concept, { lastAt: at, lastVerdict: r.verdict });
    }
    if (rows.length < PAGE) break;
  }
  return { seen, concepts };
}
