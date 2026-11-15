import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from './defaults';

export async function currentLegal(db: SupabaseClient | null, kind: 'privacy' | 'terms') {
  const { data } = db === null ? { data: null } : await db.from('legal_documents').select('version,title,body_md,published_at').eq('kind', kind).order('version', { ascending: false }).limit(1).maybeSingle().then((r) => r, () => ({ data: null }));
  if (data) return { version: data.version as number, title: data.title as string, body: data.body_md as string, publishedAt: data.published_at as string };
  return { version: 0, title: kind === 'privacy' ? 'Política de Privacidade' : 'Termo de Uso', body: kind === 'privacy' ? DEFAULT_PRIVACY : DEFAULT_TERMS, publishedAt: '' };
}
