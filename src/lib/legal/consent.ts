import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { currentLegal } from './data';

/** O aluno já aceitou a versão atual da política, do termo e o aviso de maioridade? */
export async function hasAcceptedTerms(db: SupabaseClient, userId: string): Promise<boolean> {
  const [privacy, terms, { data }] = await Promise.all([
    currentLegal(db, 'privacy'),
    currentLegal(db, 'terms'),
    db.from('consents').select('kind,version').eq('user_id', userId),
  ]);
  const rows = (data ?? []) as Array<{ kind: string; version: number }>;
  const ok = (kind: string, min: number) => rows.some((r) => r.kind === kind && r.version >= min);
  return ok('privacy', privacy.version) && ok('terms', terms.version) && ok('age_notice', 1);
}
