import 'server-only';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { LOCAL_DATA_DIR } from './mode';

/** Esquema mínimo do Supabase que as migrations esperam (papéis e auth.users). No modo local, auth.users guarda também o hash da senha. */
const SHIM = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    encrypted_password text,
    raw_user_meta_data jsonb default '{}',
    created_at timestamptz not null default now()
  );
  create unique index auth_users_email_key on auth.users (lower(email));
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

type G = { __ffRaw?: Promise<PGlite>; __ffReady?: Promise<PGlite>; __ffBooting?: boolean };
const g = globalThis as G;

/** Uma única instância por processo (PGlite não aceita dois processos no mesmo diretório). */
function rawDb(): Promise<PGlite> {
  return (g.__ffRaw ??= open());
}

/** Banco pronto: migrations aplicadas, conteúdo carregado e usuários de teste criados (só na primeira vez). */
export function localDb(): Promise<PGlite> {
  if (g.__ffBooting) return rawDb();
  return (g.__ffReady ??= (async () => {
    const pg = await rawDb();
    g.__ffBooting = true;
    try {
      const { bootstrapLocal } = await import('./bootstrap');
      await bootstrapLocal();
    } finally {
      g.__ffBooting = false;
    }
    return pg;
  })());
}

async function open(): Promise<PGlite> {
  mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  const pg = new PGlite(path.join(LOCAL_DATA_DIR, 'pg'), {
    // numeric vira número e timestamptz vira texto ISO, como o PostgREST devolve
    parsers: { 1700: (v: string) => parseFloat(v), 1184: (v: string) => new Date(v).toISOString() },
  });
  await pg.waitReady;
  const has = await pg.query<{ r: string | null }>(
    `select to_regclass('public.profiles')::text as r`,
  );
  if (!has.rows[0]?.r) {
    await pg.exec(SHIM);
    const dir = path.join(process.cwd(), 'supabase', 'migrations');
    for (const f of readdirSync(dir)
      .filter((x) => x.endsWith('.sql'))
      .sort())
      await pg.exec(readFileSync(path.join(dir, f), 'utf8'));
  }
  return pg;
}
