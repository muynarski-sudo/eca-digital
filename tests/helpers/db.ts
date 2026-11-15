import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Postgres real (WASM) com as migrations do projeto e um shim mínimo do que o Supabase fornece (schema auth, papéis). */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const dir = path.join(process.cwd(), 'supabase', 'migrations');
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(path.join(dir, f), 'utf8'));
  }
  return db;
}

export async function addUser(
  db: PGlite,
  id: string,
  email: string,
  role: 'student' | 'teacher' | 'admin' = 'student',
) {
  await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
  if (role !== 'student')
    await db.query('update public.profiles set role = $2 where id = $1', [id, role]);
}

/** Executa como um usuário autenticado (RLS ativa). */
export async function asUser<T>(db: PGlite, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
