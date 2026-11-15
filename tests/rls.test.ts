import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { addUser, asUser, createTestDb } from './helpers/db';

const ID = {
  admin: '00000000-0000-0000-0000-0000000000a0',
  t1: '00000000-0000-0000-0000-0000000000b1',
  t2: '00000000-0000-0000-0000-0000000000b2',
  s1: '00000000-0000-0000-0000-0000000000c1',
  s2: '00000000-0000-0000-0000-0000000000c2',
  s3: '00000000-0000-0000-0000-0000000000c3',
};

let db: PGlite;
const rows = async (sql: string, params: unknown[] = []) => (await db.query<Record<string, unknown>>(sql, params)).rows;
const denied = async (fn: () => Promise<unknown>) => {
  await expect(fn()).rejects.toThrow(/row-level security|permission denied|protegido|apenas|violates|só altera/i);
};

beforeAll(async () => {
  db = await createTestDb();
  await addUser(db, ID.admin, 'admin@x.com', 'admin');
  await addUser(db, ID.t1, 't1@x.com', 'teacher');
  await addUser(db, ID.t2, 't2@x.com', 'teacher');
  for (const [k, e] of [['s1', 's1@x.com'], ['s2', 's2@x.com'], ['s3', 's3@x.com']] as const) await addUser(db, ID[k], e);
  await db.exec(`
    insert into teacher_students values ('${ID.t1}', '${ID.s1}'), ('${ID.t2}', '${ID.s2}');
    insert into subscriptions (student_id, status, origin, external_id) values
      ('${ID.s1}', 'active', 'manual', 'm1'), ('${ID.s2}', 'active', 'manual', 'm2');
    insert into units (id, ord, title, objective, summary) values ('u01', 1, 'U1', 'o', 's'), ('u02', 2, 'U2', 'o', 's');
    insert into questions (id, unit_id, type, skill, prompt, answers, explanation, difficulty, source, needs_review) values
      ('q1', 'u01', 'fill_blank', 'gramatica', 'p', '["a"]', 'e', 1, 'ebook', false),
      ('q-pend', 'u01', 'fill_blank', 'gramatica', 'p', '["a"]', 'e', 1, 'ebook', true);
    insert into attempts (student_id, question_id, correct, verdict, score) values
      ('${ID.s1}', 'q1', true, 'correct', 1), ('${ID.s2}', 'q1', false, 'wrong', 0);
    insert into srs_cards (student_id, item_id) values ('${ID.s1}', 'q1'), ('${ID.s2}', 'q1');
    insert into item_mastery (student_id, item_id, mastery) values ('${ID.s1}', 'q1', 0.3), ('${ID.s2}', 'q1', 0.3);
    insert into unit_progress (student_id, unit_id, mastery) values ('${ID.s1}', 'u01', 0.2), ('${ID.s2}', 'u01', 0.2);
    insert into skill_scores (student_id, skill, score) values ('${ID.s1}', 'gramatica', 0.5), ('${ID.s2}', 'gramatica', 0.5);
    insert into assignments (id, teacher_id, student_id, title, unit_id, due_at) values
      ('10000000-0000-0000-0000-000000000001', '${ID.t1}', '${ID.s1}', 'T1', 'u01', now() + interval '3 days'),
      ('10000000-0000-0000-0000-000000000002', '${ID.t2}', '${ID.s2}', 'T2', 'u01', now() + interval '3 days');
    insert into consents (user_id, kind, version) values ('${ID.s1}', 'privacy', 1), ('${ID.s2}', 'privacy', 1);
    insert into voice_recordings (student_id, question_id, storage_path) values ('${ID.s1}', 'q1', 's1/a.webm'), ('${ID.s2}', 'q1', 's2/a.webm');
    insert into legal_documents (kind, version, title, body_md) values ('privacy', 1, 'Política', 'texto');
    insert into webhook_events (provider, event_key) values ('hotmart', 'k1');
  `);
});
afterAll(async () => db.close());

const PERSONAL = ['attempts', 'srs_cards', 'item_mastery', 'unit_progress', 'skill_scores', 'assignments', 'subscriptions', 'consents', 'voice_recordings'];

describe('RLS: aluno só acessa os próprios dados', () => {
  for (const table of PERSONAL) {
    it(`aluno 1 não lê ${table} do aluno 2`, async () => {
      const col = table === 'consents' ? 'user_id' : 'student_id';
      const mine = await asUser(db, ID.s1, () => rows(`select ${col} as owner from ${table}`));
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.every((r) => r.owner === ID.s1)).toBe(true);
    });
  }

  it('não vê o perfil de outro aluno nem de professora não vinculada', async () => {
    const r = await asUser(db, ID.s1, () => rows('select id from profiles'));
    expect(r.map((x) => x.id)).toEqual([ID.s1]);
  });

  it('não insere tentativa em nome de outro aluno', async () => {
    await denied(() => asUser(db, ID.s1, () => db.query(`insert into attempts (student_id, question_id, correct, verdict, score) values ('${ID.s2}', 'q1', true, 'correct', 1)`)));
  });

  it('insere a própria tentativa', async () => {
    await asUser(db, ID.s1, () => db.query(`insert into attempts (student_id, question_id, correct, verdict, score) values ('${ID.s1}', 'q1', true, 'correct', 1)`));
    expect((await rows(`select count(*)::int n from attempts where student_id = '${ID.s1}'`))[0]?.n).toBe(2);
  });

  it('não altera nem apaga dados do outro aluno (0 linhas afetadas)', async () => {
    const upd = await asUser(db, ID.s1, () => db.query(`update srs_cards set ease = 1.3 where student_id = '${ID.s2}'`));
    expect(upd.affectedRows).toBe(0);
    const upd2 = await asUser(db, ID.s1, () => db.query(`update item_mastery set mastery = 1 where student_id = '${ID.s2}'`));
    expect(upd2.affectedRows).toBe(0);
    const del = await asUser(db, ID.s1, () => db.query(`delete from voice_recordings where student_id = '${ID.s2}'`));
    expect(del.affectedRows).toBe(0);
    expect((await rows(`select ease from srs_cards where student_id = '${ID.s2}'`))[0]?.ease).toBe('2.5');
  });

  it('tentativas são imutáveis para o aluno', async () => {
    await denied(() => asUser(db, ID.s1, () => db.query(`update attempts set correct = true where student_id = '${ID.s1}'`)));
    await denied(() => asUser(db, ID.s1, () => db.query(`delete from attempts where student_id = '${ID.s1}'`)));
  });

  it('aluno apaga a própria gravação de voz', async () => {
    const del = await asUser(db, ID.s1, () => db.query(`delete from voice_recordings where student_id = '${ID.s1}'`));
    expect(del.affectedRows).toBe(1);
  });

  it('não vê o log de webhooks nem escreve assinatura', async () => {
    expect(await asUser(db, ID.s1, async () => { try { return (await db.query('select * from webhook_events')).rows; } catch { return 'denied'; } })).toEqual([]);
    await denied(() => asUser(db, ID.s1, () => db.query(`insert into subscriptions (student_id, status, origin) values ('${ID.s1}', 'active', 'manual')`)));
  });

  it('não muda o próprio papel, acesso ou nível', async () => {
    await denied(() => asUser(db, ID.s1, () => db.query(`update profiles set role = 'admin' where id = '${ID.s1}'`)));
    await denied(() => asUser(db, ID.s1, () => db.query(`update profiles set level = 'B2' where id = '${ID.s1}'`)));
    await asUser(db, ID.s1, () => db.query(`update profiles set full_name = 'Aluno Um' where id = '${ID.s1}'`));
  });

  it('não se libera uma unidade e não lança nota na própria tarefa', async () => {
    await denied(() => asUser(db, ID.s1, () => db.query(`insert into unit_unlocks (student_id, unit_id) values ('${ID.s1}', 'u02')`)));
    await denied(() => asUser(db, ID.s1, () => db.query(`update assignments set teacher_grade = 10 where student_id = '${ID.s1}'`)));
    await denied(() => asUser(db, ID.s1, () => db.query(`update assignments set status = 'reviewed' where student_id = '${ID.s1}'`)));
  });

  it('entrega a própria tarefa', async () => {
    await asUser(db, ID.s1, () => db.query(`update assignments set status = 'submitted', submitted_at = now() where student_id = '${ID.s1}'`));
    expect((await rows(`select status from assignments where student_id = '${ID.s1}'`))[0]?.status).toBe('submitted');
  });

  it('não reabre o próprio acesso pausado', async () => {
    await db.exec(`update profiles set access = 'paused' where id = '${ID.s3}'`);
    await denied(() => asUser(db, ID.s3, () => db.query(`update profiles set access = 'active' where id = '${ID.s3}'`)));
    await db.exec(`update profiles set access = 'active' where id = '${ID.s3}'`);
  });
});

describe('RLS: acesso depende de assinatura ativa', () => {
  it('aluno sem assinatura não lê conteúdo nem registra tentativas', async () => {
    expect(await asUser(db, ID.s3, () => rows('select id from questions'))).toEqual([]);
    expect(await asUser(db, ID.s3, () => rows('select id from units'))).toEqual([]);
    await denied(() => asUser(db, ID.s3, () => db.query(`insert into attempts (student_id, question_id, correct, verdict, score) values ('${ID.s3}', 'q1', true, 'correct', 1)`)));
  });
  it('assinatura expirada bloqueia; cancelada mantém o período pago; reembolso e chargeback bloqueiam na hora', async () => {
    const ids = async () => (await asUser(db, ID.s3, () => rows('select id from questions'))).map((r) => r.id);
    await db.exec(`insert into subscriptions (student_id, status, origin, external_id, valid_until) values ('${ID.s3}', 'active', 'hotmart', 'h1', now() - interval '1 day')`);
    expect(await ids()).toEqual([]);
    await db.exec(`update subscriptions set valid_until = now() + interval '30 days', status = 'canceled' where external_id = 'h1'`);
    expect(await ids()).toEqual(['q1']);
    await db.exec(`update subscriptions set status = 'refunded' where external_id = 'h1'`);
    expect(await ids()).toEqual([]);
    await db.exec(`update subscriptions set status = 'chargeback' where external_id = 'h1'`);
    expect(await ids()).toEqual([]);
    await db.exec(`update subscriptions set status = 'past_due' where external_id = 'h1'`);
    expect(await ids()).toEqual([]);
    await db.exec(`update subscriptions set status = 'active' where external_id = 'h1'`);
    expect(await ids()).toEqual(['q1']);
  });
  it('acesso pausado pela professora bloqueia mesmo com assinatura', async () => {
    await asUser(db, ID.t1, () => db.query(`update profiles set access = 'paused' where id = '${ID.s1}'`));
    expect(await asUser(db, ID.s1, () => rows('select id from questions'))).toEqual([]);
    await asUser(db, ID.t1, () => db.query(`update profiles set access = 'active' where id = '${ID.s1}'`));
    expect((await asUser(db, ID.s1, () => rows('select id from questions'))).length).toBe(1);
  });
  it('itens pendentes de revisão ficam escondidos do aluno e visíveis à professora', async () => {
    expect((await asUser(db, ID.s1, () => rows('select id from questions'))).map((r) => r.id)).toEqual(['q1']);
    expect((await asUser(db, ID.t1, () => rows('select id from questions order by id'))).map((r) => r.id)).toEqual(['q-pend', 'q1']);
  });
});

describe('RLS: professora lê só os alunos vinculados', () => {
  it('professora 1 vê dados do aluno 1 e não do 2 nem do 3', async () => {
    for (const table of ['attempts', 'srs_cards', 'item_mastery', 'unit_progress', 'skill_scores', 'subscriptions']) {
      const r = await asUser(db, ID.t1, () => rows(`select distinct student_id from ${table}`));
      expect(r.map((x) => x.student_id), table).toEqual([ID.s1]);
    }
    const p = await asUser(db, ID.t1, () => rows('select id from profiles order by id'));
    expect(p.map((x) => x.id)).toEqual([ID.t1, ID.s1]);
  });
  it('professora não ouve gravações de voz', async () => {
    expect(await asUser(db, ID.t1, () => rows('select * from voice_recordings'))).toEqual([]);
  });
  it('professora atribui tarefa só a aluno vinculado', async () => {
    await asUser(db, ID.t1, () => db.query(`insert into assignments (teacher_id, student_id, title, unit_id, due_at) values ('${ID.t1}', '${ID.s1}', 'Nova', 'u01', now() + interval '1 day')`));
    await denied(() => asUser(db, ID.t1, () => db.query(`insert into assignments (teacher_id, student_id, title, unit_id, due_at) values ('${ID.t1}', '${ID.s2}', 'Nova', 'u01', now() + interval '1 day')`)));
  });
  it('professora dá nota e feedback na tarefa do seu aluno, e não na de outro', async () => {
    await asUser(db, ID.t1, () => db.query(`update assignments set teacher_grade = 9, teacher_feedback = 'Voilà!', status = 'reviewed' where student_id = '${ID.s1}' and title = 'T1'`));
    expect((await rows(`select teacher_grade::int g from assignments where title = 'T1'`))[0]?.g).toBe(9);
    const r = await asUser(db, ID.t1, () => db.query(`update assignments set teacher_grade = 1 where student_id = '${ID.s2}'`));
    expect(r.affectedRows).toBe(0);
  });
  it('professora concede acesso manual, mas não cria assinatura Hotmart nem para aluno alheio', async () => {
    await asUser(db, ID.t1, () => db.query(`insert into subscriptions (student_id, status, origin, external_id) values ('${ID.s1}', 'active', 'manual', 'm1b')`));
    await denied(() => asUser(db, ID.t1, () => db.query(`insert into subscriptions (student_id, status, origin, external_id) values ('${ID.s1}', 'active', 'hotmart', 'hx')`)));
    await denied(() => asUser(db, ID.t1, () => db.query(`insert into subscriptions (student_id, status, origin, external_id) values ('${ID.s2}', 'active', 'manual', 'm2b')`)));
  });
  it('professora libera unidade para o seu aluno, não para outro', async () => {
    await asUser(db, ID.t1, () => db.query(`insert into unit_unlocks (student_id, unit_id, unlocked_by) values ('${ID.s1}', 'u02', '${ID.t1}')`));
    await denied(() => asUser(db, ID.t1, () => db.query(`insert into unit_unlocks (student_id, unit_id, unlocked_by) values ('${ID.s2}', 'u02', '${ID.t1}')`)));
    expect((await asUser(db, ID.s1, () => rows('select unit_id from unit_unlocks'))).length).toBe(1);
  });
  it('professora não edita conteúdo', async () => {
    await denied(() => asUser(db, ID.t1, () => db.query(`insert into units (id, ord, title, objective, summary) values ('u99', 99, 'x', 'x', 'x')`)));
    const r = await asUser(db, ID.t1, () => db.query(`update questions set prompt = 'hack' where id = 'q1'`));
    expect(r.affectedRows).toBe(0);
  });
  it('professora não vê webhooks', async () => {
    expect(await asUser(db, ID.t1, async () => { try { return (await db.query('select * from webhook_events')).rows; } catch { return 'denied'; } })).toEqual([]);
  });
  it('professora vincula aluno a si, mas aluno não se vincula a professora alheia', async () => {
    await asUser(db, ID.t1, () => db.query(`insert into teacher_students values ('${ID.t1}', '${ID.s3}')`)); // staff pode vincular a si
    expect((await asUser(db, ID.t1, () => rows(`select id from profiles where id = '${ID.s3}'`))).length).toBe(1);
    await denied(() => asUser(db, ID.s1, () => db.query(`insert into teacher_students values ('${ID.t2}', '${ID.s1}')`)));
  });
});

describe('RLS: admin e anônimo', () => {
  it('admin lê tudo', async () => {
    expect((await asUser(db, ID.admin, () => rows('select id from profiles'))).length).toBe(6);
    expect((await asUser(db, ID.admin, () => rows('select distinct student_id from attempts'))).length).toBe(2);
    expect((await asUser(db, ID.admin, () => rows('select * from webhook_events'))).length).toBe(1);
  });
  it('admin edita conteúdo', async () => {
    await asUser(db, ID.admin, () => db.query(`update questions set explanation = 'novo' where id = 'q1'`));
    expect((await rows(`select explanation from questions where id = 'q1'`))[0]?.explanation).toBe('novo');
  });
  it('anônimo não lê dados, mas lê documentos legais publicados', async () => {
    await denied(() => asUser(db, null, () => db.query('select * from profiles')));
    expect((await asUser(db, null, () => rows('select title from legal_documents'))).length).toBe(1);
  });
});

describe('compra antes do cadastro', () => {
  it('pending_grants não é legível por aluno e vira assinatura no cadastro', async () => {
    await db.exec(`insert into pending_grants (email, origin, external_id, status, valid_until) values ('Comprador@x.com', 'hotmart', 'HP1', 'active', now() + interval '30 days')`);
    await denied(() => asUser(db, ID.s1, () => db.query('select * from pending_grants')));
    await addUser(db, '00000000-0000-0000-0000-0000000000e1', 'comprador@x.com');
    const sub = await rows(`select status, origin from subscriptions where student_id = '00000000-0000-0000-0000-0000000000e1'`);
    expect(sub).toEqual([{ status: 'active', origin: 'hotmart' }]);
    expect(await rows('select * from pending_grants')).toEqual([]);
  });
});

describe('convite por e-mail', () => {
  it('ao cadastrar, vincula o aluno à professora que convidou', async () => {
    await asUser(db, ID.t2, () => db.query(`insert into invites (teacher_id, email) values ('${ID.t2}', 'novo@x.com')`));
    await addUser(db, '00000000-0000-0000-0000-0000000000c9', 'NOVO@x.com');
    const r = await rows(`select teacher_id from teacher_students where student_id = '00000000-0000-0000-0000-0000000000c9'`);
    expect(r.map((x) => x.teacher_id)).toEqual([ID.t2]);
    expect((await rows(`select accepted_at from invites where email = 'novo@x.com'`))[0]?.accepted_at).not.toBeNull();
  });
  it('um cadastro nunca nasce como professora ou admin', async () => {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000d1', 'x@x.com', '{"role":"admin"}')`);
    expect((await rows(`select role from profiles where id = '00000000-0000-0000-0000-0000000000d1'`))[0]?.role).toBe('student');
  });
});

describe('exclusão de conta', () => {
  it('apagar o usuário em auth.users remove perfil e dados de estudo em cascata', async () => {
    const id = '00000000-0000-0000-0000-0000000000f1';
    await addUser(db, id, 'sai@x.com');
    await db.exec(`
      insert into attempts (student_id, question_id, correct, verdict, score) values ('${id}', 'q1', true, 'correct', 1);
      insert into srs_cards (student_id, item_id) values ('${id}', 'q1');
      insert into consents (user_id, kind, version) values ('${id}', 'privacy', 1);
      insert into voice_recordings (student_id, question_id, storage_path) values ('${id}', 'q1', '${id}/a.webm');
    `);
    await db.exec(`delete from auth.users where id = '${id}'`);
    for (const t of ['profiles', 'attempts', 'srs_cards', 'consents', 'voice_recordings']) {
      const col = t === 'profiles' ? 'id' : t === 'consents' ? 'user_id' : 'student_id';
      expect(await rows(`select 1 from ${t} where ${col} = '${id}'`), t).toEqual([]);
    }
  });
});
