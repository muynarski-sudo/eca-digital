import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WeakTag { tag: string; errors: number; attempts: number }

export const TAG_LABELS: Record<string, string> = {
  negacao_de: 'Negativa com "de"', negacao_ne_pas: 'Negativa ne...pas', elisao_apostrofo: 'Apóstrofo (j\'ai, l\'école)', concordancia_feminino: 'Feminino',
  concordancia_plural: 'Plural', artigo_contraido: 'À/de + artigo (au, du...)', artigo_definido_indefinido: 'Artigos (le, un...)', conjugacao_etre: 'Verbo être',
  conjugacao_avoir: 'Verbo avoir', conjugacao_faire: 'Verbo faire', conjugacao_aller: 'Verbo aller', conjugacao_irregular: 'Verbos irregulares', conjugacao_regular: 'Verbos regulares',
  possessivo: 'Possessivos', demonstrativo: 'Demonstrativos', horas: 'Horas', dias_meses: 'Dias e meses', estacoes_clima: 'Estações e clima', preposicao_lugar: 'Preposições de lugar',
  chez: 'Chez', il_y_a: 'Il y a', c_est: "C'est", interrogativa: 'Perguntas', numeros: 'Números', cortesia: 'Cortesia', acentuacao: 'Acentuação', ordem_palavras: 'Ordem das palavras',
  vocabulario_viagem: 'Vocabulário de viagem', conectivos: 'Conectivos',
};
export const tagLabel = (t: string) => TAG_LABELS[t] ?? t.replace(/_/g, ' ');

/** Pontos fracos: erros por tag nas últimas tentativas. */
export async function weakTags(db: SupabaseClient, studentId: string, days = 60, limit = 8): Promise<WeakTag[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await db.from('attempts').select('verdict,error_tags').eq('student_id', studentId).gte('created_at', since).order('created_at', { ascending: false }).limit(1500);
  const map = new Map<string, WeakTag>();
  for (const a of data ?? []) {
    for (const t of (a.error_tags as string[]) ?? []) {
      const e = map.get(t) ?? { tag: t, errors: 0, attempts: 0 };
      e.attempts++;
      if (a.verdict !== 'correct') e.errors++;
      map.set(t, e);
    }
  }
  return [...map.values()].filter((t) => t.errors > 0).sort((a, b) => b.errors - a.errors || b.errors / b.attempts - a.errors / a.attempts).slice(0, limit);
}
