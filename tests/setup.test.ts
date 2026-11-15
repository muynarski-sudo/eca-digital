import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

let db: SupabaseClient;
let setup: typeof import('@/lib/setup/admin');

beforeAll(async () => {
  process.env.LOCAL_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'ffp-setup-'));
  process.env.LOCAL_SKIP_TESTERS = '1';
  const { LocalClient } = await import('@/lib/local/client');
  setup = await import('@/lib/setup/admin');
  db = new LocalClient({ role: 'service', uid: null }) as unknown as SupabaseClient;
}, 120_000);
afterAll(async () => {
  const { localDb } = await import('@/lib/local/db');
  await (await localDb()).close();
});

const input = {
  token: 'codigo-secreto',
  name: 'Instrutora Teste',
  email: 'Instrutora@Escola.com',
  password: 'senha-bem-longa-1',
};

describe('instalação inicial (primeira administradora)', () => {
  it('começa sem administradora', async () => {
    expect(await setup.adminExists(db)).toBe(false);
  });
  it('recusa quando o servidor não definiu o código', async () => {
    const r = await setup.setupFirstAdmin(db, input, undefined);
    expect(r.ok).toBe(false);
  });
  it('recusa código errado, senha curta e e-mail inválido, sem criar ninguém', async () => {
    expect(
      await setup.setupFirstAdmin(db, { ...input, token: 'errado' }, 'codigo-secreto'),
    ).toMatchObject({ ok: false, error: 'Código de instalação incorreto.' });
    expect(
      await setup.setupFirstAdmin(db, { ...input, password: 'curta' }, 'codigo-secreto'),
    ).toMatchObject({ ok: false });
    expect(
      await setup.setupFirstAdmin(db, { ...input, email: 'sem-arroba' }, 'codigo-secreto'),
    ).toMatchObject({ ok: false });
    expect(await setup.adminExists(db)).toBe(false);
  });
  it('cria a administradora, normaliza o e-mail, permite entrar e carrega o conteúdo', async () => {
    const r = await setup.setupFirstAdmin(db, input, 'codigo-secreto');
    expect(r).toEqual({ ok: true, email: 'instrutora@escola.com', contentLoaded: true });
    expect(await setup.adminExists(db)).toBe(true);
    const { data: p } = await db
      .from('profiles')
      .select('role,full_name,email')
      .eq('email', 'instrutora@escola.com')
      .single();
    expect(p).toMatchObject({ role: 'admin', full_name: 'Instrutora Teste' });
    const { count } = await db.from('questions').select('id', { count: 'exact', head: true });
    expect(count).toBeGreaterThan(1500);
    const { LocalClient } = await import('@/lib/local/client');
    const anon = new LocalClient({ role: 'anon', uid: null });
    const login = await anon.auth.signInWithPassword({
      email: 'Instrutora@Escola.com',
      password: input.password,
    });
    expect(login.error).toBeNull();
  }, 60_000);
  it('só funciona uma vez', async () => {
    const again = await setup.setupFirstAdmin(
      db,
      { ...input, email: 'outra@escola.com' },
      'codigo-secreto',
    );
    expect(again).toMatchObject({ ok: false, error: 'A instalação inicial já foi feita.' });
  });
  it('compara o código em tempo constante', () => {
    expect(setup.sameToken('abc', 'abc')).toBe(true);
    expect(setup.sameToken('abc', 'abd')).toBe(false);
    expect(setup.sameToken('', 'abc')).toBe(false);
    expect(setup.sameToken('abc', '')).toBe(false);
  });
});
