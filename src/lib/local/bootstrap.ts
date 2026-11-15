import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { seedContent } from '@/lib/content/seed';
import { seedDev } from '@/lib/dev/seed';
import { LocalClient } from './client';
import { LOCAL_TESTERS } from './testers';

/** Primeira execução do modo local: carrega o conteúdo e cria os usuários de teste. Idempotente. */
export async function bootstrapLocal() {
  const db = new LocalClient({ role: 'service', uid: null }) as unknown as SupabaseClient;
  const { count } = await db.from('units').select('id', { count: 'exact', head: true });
  if (!count) await seedContent(db, { log: (m) => console.warn(`[local] ${m}`) });
  await seedDev(db, LOCAL_TESTERS, (m) => console.warn(`[local] ${m}`));
}
