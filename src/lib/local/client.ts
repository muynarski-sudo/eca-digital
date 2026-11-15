import 'server-only';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { localDb } from './db';
import { hashPassword, verifyPassword } from './password';
import { LOCAL_COOKIE, LOCAL_DATA_DIR, localSecret } from './mode';
import { SESSION_SECONDS, signSession, verifySession } from './session';

/**
 * Cliente com a mesma "cara" do supabase-js para as chamadas que o app usa, mas rodando sobre o PGlite local.
 * A RLS é a real: cada consulta roda numa transação com `set local role` e o usuário da sessão.
 */
export type Role = 'anon' | 'authenticated' | 'service';
export interface Ctx {
  role: Role;
  uid: string | null;
}
type Err = { message: string; code?: string } | null;
interface Result {
  data: unknown;
  error: Err;
  count?: number | null;
}

const IDENT = /^[a-z_][a-z0-9_]*$/i;
const ident = (s: string) => {
  if (!IDENT.test(s)) throw new Error(`identificador inválido: ${s}`);
  return `"${s}"`;
};

async function run<T>(
  ctx: Ctx,
  fn: (
    q: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[]; affectedRows?: number }>,
  ) => Promise<T>,
): Promise<T> {
  const pg = await localDb();
  return pg.transaction(async (tx) => {
    if (ctx.role !== 'service') {
      await tx.exec(`set local role ${ctx.role}`);
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [ctx.uid ?? '']);
    }
    return fn(
      (sql, params) => tx.query<Record<string, unknown>>(sql, params as unknown[]) as never,
    );
  });
}

const colCache = new Map<string, Promise<Map<string, string>>>();
async function columnTypes(table: string): Promise<Map<string, string>> {
  if (!colCache.has(table)) {
    colCache.set(
      table,
      (async () => {
        const pg = await localDb();
        const r = await pg.query<{ column_name: string; data_type: string }>(
          `select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1`,
          [table],
        );
        return new Map(r.rows.map((x) => [x.column_name, x.data_type]));
      })(),
    );
  }
  return colCache.get(table)!;
}
const pkCache = new Map<string, Promise<string[]>>();
async function primaryKey(table: string): Promise<string[]> {
  if (!pkCache.has(table)) {
    pkCache.set(
      table,
      (async () => {
        const pg = await localDb();
        const r = await pg.query<{ attname: string }>(
          `select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = ('public.' || $1)::regclass and i.indisprimary`,
          [table],
        );
        return r.rows.map((x) => x.attname);
      })(),
    );
  }
  return pkCache.get(table)!;
}

type Filter = { sql: (n: number) => string; params: unknown[] };

class Query implements PromiseLike<Result> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private cols = '*';
  private filters: Filter[] = [];
  private orders: string[] = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private mode: 'many' | 'maybe' | 'one' = 'many';
  private head = false;
  private wantCount = false;
  private payload: Record<string, unknown>[] = [];
  private onConflict: string | null = null;
  private ignoreDup = false;
  private returning = false;

  constructor(
    private readonly ctx: Ctx,
    private readonly table: string,
  ) {}

  select(cols = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this.op === 'select') {
      this.cols = cols;
      this.head = !!opts?.head;
      this.wantCount = opts?.count === 'exact';
    } else {
      this.returning = true;
      this.cols = cols;
    }
    return this;
  }
  insert(rows: object | object[]) {
    this.op = 'insert';
    this.payload = (Array.isArray(rows) ? rows : [rows]) as Record<string, unknown>[];
    return this;
  }
  upsert(rows: object | object[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert';
    this.payload = (Array.isArray(rows) ? rows : [rows]) as Record<string, unknown>[];
    this.onConflict = opts?.onConflict ?? null;
    this.ignoreDup = !!opts?.ignoreDuplicates;
    return this;
  }
  update(values: object) {
    this.op = 'update';
    this.payload = [values as Record<string, unknown>];
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  private cmp(col: string, op: string, v: unknown) {
    this.filters.push({ sql: (n) => `${ident(col)} ${op} $${n}`, params: [v] });
    return this;
  }
  eq(c: string, v: unknown) {
    return this.cmp(c, '=', v);
  }
  neq(c: string, v: unknown) {
    return this.cmp(c, '<>', v);
  }
  lt(c: string, v: unknown) {
    return this.cmp(c, '<', v);
  }
  lte(c: string, v: unknown) {
    return this.cmp(c, '<=', v);
  }
  gt(c: string, v: unknown) {
    return this.cmp(c, '>', v);
  }
  gte(c: string, v: unknown) {
    return this.cmp(c, '>=', v);
  }
  in(c: string, vals: unknown[]) {
    if (vals.length === 0) this.filters.push({ sql: () => 'false', params: [] });
    else
      this.filters.push({
        sql: (n) => `${ident(c)} in (${vals.map((_, i) => `$${n + i}`).join(',')})`,
        params: vals,
      });
    return this;
  }
  is(c: string, v: null | boolean) {
    this.filters.push({
      sql: () => `${ident(c)} is ${v === null ? 'null' : v ? 'true' : 'false'}`,
      params: [],
    });
    return this;
  }
  not(c: string, op: string, v: unknown) {
    if (op !== 'is') throw new Error('not() só suporta "is"');
    this.filters.push({
      sql: () => `${ident(c)} is not ${v === null ? 'null' : String(v)}`,
      params: [],
    });
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) {
    this.orders.push(`${ident(c)} ${o?.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.offsetN = from;
    this.limitN = to - from + 1;
    return this;
  }
  maybeSingle() {
    this.mode = 'maybe';
    return this;
  }
  single() {
    this.mode = 'one';
    return this;
  }

  then<A = Result, B = never>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    bad?: ((r: unknown) => B | PromiseLike<B>) | null,
  ) {
    return this.exec().then(ok, bad);
  }

  private where(startAt: number) {
    let n = startAt;
    const parts: string[] = [];
    const params: unknown[] = [];
    for (const f of this.filters) {
      parts.push(f.sql(n));
      n += f.params.length;
      params.push(...f.params);
    }
    return { sql: parts.length ? ` where ${parts.join(' and ')}` : '', params };
  }

  private columns(): string {
    if (this.cols.trim() === '*') return '*';
    return this.cols
      .split(',')
      .map((c) => ident(c.trim()))
      .join(', ');
  }

  private prepared(rows: Record<string, unknown>[], types: Map<string, string>) {
    return rows.map((r) =>
      Object.fromEntries(
        Object.entries(r)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => {
            const t = types.get(k);
            return [
              k,
              v !== null &&
              typeof v === 'object' &&
              !(v instanceof Date) &&
              (t === 'jsonb' || t === 'json')
                ? JSON.stringify(v)
                : v,
            ];
          }),
      ),
    );
  }

  private async exec(): Promise<Result> {
    try {
      // metadados lidos ANTES da transação (o PGlite não aceita outra consulta enquanto há uma transação aberta)
      const writes = this.op !== 'select' && this.op !== 'delete';
      const types = writes ? await columnTypes(this.table) : new Map<string, string>();
      const pk = this.op === 'upsert' && !this.onConflict ? await primaryKey(this.table) : [];
      return await run(this.ctx, async (q) => {
        const t = ident(this.table);
        let rows: Record<string, unknown>[] = [];
        let count: number | null = null;

        if (this.op === 'select') {
          const w = this.where(1);
          if (this.head && this.wantCount) {
            const r = await q(`select count(*)::int as n from ${t}${w.sql}`, w.params);
            return { data: null, error: null, count: Number(r.rows[0]?.n ?? 0) } as Result;
          }
          const order = this.orders.length ? ` order by ${this.orders.join(', ')}` : '';
          const limit =
            (this.limitN !== null ? ` limit ${Math.max(0, Math.floor(this.limitN))}` : '') +
            (this.offsetN ? ` offset ${Math.max(0, Math.floor(this.offsetN))}` : '');
          rows = (await q(`select ${this.columns()} from ${t}${w.sql}${order}${limit}`, w.params))
            .rows;
          if (this.wantCount) count = rows.length;
        } else if (this.op === 'insert' || this.op === 'upsert') {
          const prepared = this.prepared(this.payload, types);
          const keys = [...new Set(prepared.flatMap((r) => Object.keys(r)))];
          if (prepared.length === 0 || keys.length === 0)
            return { data: [], error: null } as Result;
          const params: unknown[] = [];
          const values = prepared.map(
            (r) =>
              `(${keys.map((k) => (k in r ? (params.push(r[k]), `$${params.length}`) : 'default')).join(',')})`,
          );
          let sql = `insert into ${t} (${keys.map(ident).join(',')}) values ${values.join(',')}`;
          if (this.op === 'upsert') {
            const conflict = this.onConflict ? this.onConflict.split(',').map((c) => c.trim()) : pk;
            const sets = keys
              .filter((k) => !conflict.includes(k))
              .map((k) => `${ident(k)} = excluded.${ident(k)}`);
            sql +=
              ` on conflict (${conflict.map(ident).join(',')}) ` +
              (this.ignoreDup || sets.length === 0
                ? 'do nothing'
                : `do update set ${sets.join(', ')}`);
          }
          sql += this.returning ? ` returning ${this.columns()}` : '';
          rows = (await q(sql, params)).rows;
        } else if (this.op === 'update') {
          const [vals] = this.prepared(this.payload, types);
          const keys = Object.keys(vals ?? {});
          if (keys.length === 0) return { data: null, error: null } as Result;
          const params = keys.map((k) => vals![k]);
          const w = this.where(params.length + 1);
          const sql = `update ${t} set ${keys.map((k, i) => `${ident(k)} = $${i + 1}`).join(', ')}${w.sql}${this.returning ? ` returning ${this.columns()}` : ''}`;
          rows = (await q(sql, [...params, ...w.params])).rows;
        } else {
          const w = this.where(1);
          rows = (
            await q(
              `delete from ${t}${w.sql}${this.returning ? ` returning ${this.columns()}` : ''}`,
              w.params,
            )
          ).rows;
        }

        const returnsRows = this.op === 'select' || this.returning;
        if (this.mode === 'maybe') {
          if (rows.length > 1)
            return {
              data: null,
              error: { message: 'mais de uma linha', code: 'PGRST116' },
            } as Result;
          return { data: rows[0] ?? null, error: null, count } as Result;
        }
        if (this.mode === 'one') {
          if (rows.length !== 1)
            return {
              data: null,
              error: {
                message: 'JSON object requested, multiple (or no) rows returned',
                code: 'PGRST116',
              },
            } as Result;
          return { data: rows[0], error: null, count } as Result;
        }
        return { data: returnsRows ? rows : null, error: null, count } as Result;
      });
    } catch (e) {
      const err = e as { message?: string; code?: string };
      return {
        data: null,
        error: { message: err.message ?? String(e), code: err.code },
        count: null,
      };
    }
  }
}

// ---------- Storage em disco ----------
function storage(bucket: string) {
  const root = path.join(LOCAL_DATA_DIR, 'storage', bucket);
  const safe = (p: string) => {
    const full = path.resolve(root, p);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error('caminho inválido');
    return full;
  };
  return {
    async upload(p: string, data: Uint8Array | ArrayBuffer | Blob, opts?: { upsert?: boolean }) {
      try {
        const full = safe(p);
        if (existsSync(full) && !opts?.upsert)
          return { data: null, error: { message: 'The resource already exists' } };
        mkdirSync(path.dirname(full), { recursive: true });
        const buf =
          data instanceof Blob
            ? Buffer.from(await data.arrayBuffer())
            : Buffer.from(data as Uint8Array);
        writeFileSync(full, buf);
        return { data: { path: p }, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },
    async remove(paths: string[]) {
      for (const p of paths) rmSync(safe(p), { force: true });
      return { data: paths.map((name) => ({ name })), error: null };
    },
    async list(prefix = '', opts?: { limit?: number; offset?: number }) {
      const dir = safe(prefix);
      const names = existsSync(dir) ? readdirSync(dir) : [];
      return {
        data: names
          .slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 100))
          .map((name) => ({ name })),
        error: null,
      };
    },
    async createSignedUrl(p: string) {
      const full = safe(p);
      if (!existsSync(full)) return { data: null, error: { message: 'Object not found' } };
      return {
        data: {
          signedUrl: `/api/local-file?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(p)}`,
        },
        error: null,
      };
    },
    read(p: string): Buffer | null {
      const full = safe(p);
      return existsSync(full) ? readFileSync(full) : null;
    },
  };
}

// ---------- Auth local ----------
async function userByEmail(email: string) {
  const pg = await localDb();
  const r = await pg.query<{ id: string; email: string; encrypted_password: string | null }>(
    `select id, email, encrypted_password from auth.users where lower(email) = lower($1)`,
    [email],
  );
  return r.rows[0] ?? null;
}

function authApi(ctx: Ctx) {
  const setCookie = async (uid: string) => {
    const jar = await cookies();
    jar.set(LOCAL_COOKIE, await signSession(localSecret(), uid), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_SECONDS,
    });
  };
  const sessionUid = async (): Promise<string | null> => {
    if (ctx.uid) return ctx.uid;
    try {
      return await verifySession(localSecret(), (await cookies()).get(LOCAL_COOKIE)?.value);
    } catch {
      return null;
    }
  };
  return {
    async getUser() {
      const uid = await sessionUid();
      if (!uid) return { data: { user: null }, error: null };
      const pg = await localDb();
      const r = await pg.query<{ id: string; email: string }>(
        `select id, email from auth.users where id = $1`,
        [uid],
      );
      const u = r.rows[0];
      return { data: { user: u ? { id: u.id, email: u.email } : null }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const u = await userByEmail(email);
      if (!u || !verifyPassword(password, u.encrypted_password))
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        };
      ctx.uid = u.id;
      ctx.role = 'authenticated';
      await setCookie(u.id);
      return {
        data: { user: { id: u.id, email: u.email }, session: { access_token: 'local' } },
        error: null,
      };
    },
    async signOut() {
      ctx.uid = null;
      (await cookies()).delete(LOCAL_COOKIE);
      return { error: null };
    },
    async updateUser({ password }: { password: string }) {
      const uid = await sessionUid();
      if (!uid) return { data: null, error: { message: 'sem sessão' } };
      const pg = await localDb();
      await pg.query(`update auth.users set encrypted_password = $2 where id = $1`, [
        uid,
        hashPassword(password),
      ]);
      return { data: { user: { id: uid } }, error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async exchangeCodeForSession() {
      return { data: null, error: { message: 'indisponível no modo local' } };
    },
    admin: {
      async createUser({
        email,
        password,
        user_metadata,
      }: {
        email: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }) {
        try {
          const pg = await localDb();
          const id = randomUUID();
          await pg.query(
            `insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values ($1, $2, $3, $4)`,
            [
              id,
              email.trim().toLowerCase(),
              password ? hashPassword(password) : null,
              JSON.stringify(user_metadata ?? {}),
            ],
          );
          return { data: { user: { id, email } }, error: null };
        } catch (e) {
          const m = (e as Error).message;
          return {
            data: { user: null },
            error: { message: /duplicate|unique/i.test(m) ? 'User already registered' : m },
          };
        }
      },
      async deleteUser(id: string) {
        const pg = await localDb();
        await pg.query(`delete from auth.users where id = $1`, [id]);
        return { data: {}, error: null };
      },
      async updateUserById(id: string, attrs: { password?: string }) {
        const pg = await localDb();
        if (attrs.password)
          await pg.query(`update auth.users set encrypted_password = $2 where id = $1`, [
            id,
            hashPassword(attrs.password),
          ]);
        return { data: { user: { id } }, error: null };
      },
      async inviteUserByEmail() {
        return { data: null, error: { message: 'Convite por e-mail indisponível no modo local' } };
      },
    },
  };
}

export class LocalClient {
  readonly auth: ReturnType<typeof authApi>;
  constructor(private readonly ctx: Ctx) {
    this.auth = authApi(ctx);
  }
  from(table: string) {
    return new Query(this.ctx, table);
  }
  async rpc(fn: string, args: Record<string, unknown> = {}) {
    try {
      const keys = Object.keys(args);
      const named = keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ');
      const r = await run(this.ctx, (q) =>
        q(
          `select public.${ident(fn)}(${named}) as v`,
          keys.map((k) => args[k]),
        ),
      );
      return { data: r.rows[0]?.v ?? null, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
  get storage() {
    return { from: storage };
  }
}
