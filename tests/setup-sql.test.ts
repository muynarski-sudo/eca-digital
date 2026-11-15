import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('supabase/setup.sql', () => {
  it('está em dia com as migrations (rode scripts/build-setup-sql.sh se falhar)', () => {
    const dir = path.join(process.cwd(), 'supabase', 'migrations');
    const all = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const sql = readFileSync(path.join(process.cwd(), 'supabase', 'setup.sql'), 'utf8');
    for (const f of all) {
      expect(sql, f).toContain(`===== ${f} =====`);
      expect(sql, f).toContain(readFileSync(path.join(dir, f), 'utf8'));
    }
  });
  it('instala o esquema completo em um Postgres limpo', async () => {
    const db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.exec(readFileSync(path.join(process.cwd(), 'supabase', 'setup.sql'), 'utf8'));
    const t = await db.query<{ n: string }>(
      `select count(*)::text n from information_schema.tables where table_schema='public' and table_name in ('profiles','attempts','questions','consents','unit_unlocks','voice_recordings')`,
    );
    expect(t.rows[0]?.n).toBe('6');
    const rls = await db.query<{ n: string }>(
      `select count(*)::text n from pg_tables where schemaname='public' and not rowsecurity`,
    );
    expect(rls.rows[0]?.n).toBe('0'); // toda tabela pública com RLS ligada
  });
});
