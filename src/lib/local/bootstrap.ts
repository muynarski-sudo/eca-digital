import 'server-only';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { seedContent } from '@/lib/content/seed';
import { seedDev } from '@/lib/dev/seed';
import { LocalClient } from './client';
import { rawDb } from './db';
import { LOCAL_TESTERS } from './testers';

/** Primeira execução do modo local: carrega o conteúdo e cria os usuários de teste. Idempotente. */
export async function bootstrapLocal() {
  const db = new LocalClient({ role: 'service', uid: null }) as unknown as SupabaseClient;
  // recarrega o conteúdo sempre que os arquivos de content/data mudarem (as migrations já foram aplicadas ao abrir o banco)
  const dir = path.join(process.cwd(), 'content', 'data');
  const hash = createHash('sha1');
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith('.json'))
    .sort())
    hash.update(readFileSync(path.join(dir, f)));
  const digest = hash.digest('hex');
  const pg = await rawDb();
  await pg.exec(`create table if not exists public._local_kv (k text primary key, v text)`);
  const cur = await pg.query<{ v: string }>(
    `select v from public._local_kv where k = 'content_hash'`,
  );
  if (cur.rows[0]?.v !== digest) {
    await seedContent(db, { log: (m) => console.warn(`[local] ${m}`) });
    await pg.query(
      `insert into public._local_kv (k, v) values ('content_hash', $1) on conflict (k) do update set v = excluded.v`,
      [digest],
    );
  }
  await seedDev(db, LOCAL_TESTERS, (m) => console.warn(`[local] ${m}`));
}
