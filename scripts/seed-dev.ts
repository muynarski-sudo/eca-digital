/* Seed de desenvolvimento: 1 professora, 2 alunos e histórico simulado. NUNCA rode em produção.
   Uso: npm run db:seed-dev (depois de npm run content:seed). */
import { loadContent } from '../src/lib/content/load';
import { gradeQuestion } from '../src/lib/domain/grade';
import { persistResult } from '../src/lib/practice/persist';
import { serviceClient } from './lib/env';

const PASSWORD = 'senha-dev-123';
const USERS = [
  { email: 'professora@dev.local', name: 'Professora Dev', role: 'teacher' },
  { email: 'ana@dev.local', name: 'Ana Aluna', role: 'student' },
  { email: 'bruno@dev.local', name: 'Bruno Aluno', role: 'student' },
] as const;

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed-dev não roda em produção');
  const db = serviceClient();
  const c = loadContent();
  const ids: Record<string, string> = {};

  for (const u of USERS) {
    const { data: found } = await db
      .from('profiles')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();
    let id = found?.id as string | undefined;
    if (!id) {
      const { data, error } = await db.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });
      if (error || !data.user) throw new Error(`createUser ${u.email}: ${error?.message}`);
      id = data.user.id;
    }
    ids[u.email] = id;
    await db.from('profiles').update({ role: u.role, full_name: u.name }).eq('id', id);
  }
  const teacher = ids['professora@dev.local']!;
  for (const email of ['ana@dev.local', 'bruno@dev.local']) {
    const sid = ids[email]!;
    await db.from('teacher_students').upsert({ teacher_id: teacher, student_id: sid });
    await db.from('subscriptions').upsert(
      {
        student_id: sid,
        status: 'active',
        origin: 'manual',
        external_id: `manual-${sid}`,
        valid_until: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      },
      { onConflict: 'origin,external_id' },
    );
    for (const kind of ['privacy', 'terms'] as const)
      await db.from('consents').insert({ user_id: sid, kind, version: 0 });
    await db.from('consents').insert({ user_id: sid, kind: 'age_notice', version: 1 });
  }

  // histórico simulado: Ana forte nas unidades 1 a 3, Bruno irregular e parado há 9 dias
  const usable = c.questions.filter(
    (q) => !q.needs_review && q.unit && !['speak', 'dictation', 'match_pairs'].includes(q.type),
  );
  const sim = async (
    email: string,
    units: string[],
    days: number,
    daysAgoEnd: number,
    accuracy: number,
    seed: number,
  ) => {
    const sid = ids[email]!;
    const { count } = await db
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', sid);
    if ((count ?? 0) > 0) return console.warn(`${email}: histórico já existe, pulando`);
    const rand = rng(seed);
    for (let d = days; d >= daysAgoEnd; d--) {
      if (rand() < 0.2) continue; // dias sem estudar
      const when = new Date(Date.now() - d * 86_400_000 + 12 * 3_600_000);
      const pool = usable.filter((q) => units.includes(q.unit!));
      for (let n = 0; n < 8; n++) {
        const q = pool[Math.floor(rand() * pool.length)]!;
        const ok = rand() < accuracy;
        const response = ok
          ? q.answers[0]!
          : q.type === 'multiple_choice'
            ? (q.choices?.find((x) => x !== q.answers[0]) ?? 'x')
            : 'resposta errada';
        const grade = gradeQuestion(q, response);
        await persistResult(db, {
          studentId: sid,
          itemId: q.id,
          itemKind: 'question',
          unit: q.unit,
          skill: q.skill,
          tags: q.error_tags,
          grade,
          response,
          elapsedMs: 4000 + Math.floor(rand() * 9000),
          now: new Date(when.getTime() + n * 60_000),
        });
      }
    }
    console.warn(`${email}: histórico simulado criado`);
  };
  await sim('ana@dev.local', ['u01', 'u02', 'u03'], 21, 0, 0.88, 7);
  await sim('bruno@dev.local', ['u01', 'u04', 'u08'], 25, 9, 0.55, 11);

  // tarefas
  const { count: tc } = await db
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacher);
  if (!tc) {
    await db.from('assignments').insert([
      {
        teacher_id: teacher,
        student_id: ids['ana@dev.local'],
        title: 'Unidade 3: números e viagens',
        unit_id: 'u03',
        due_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      },
      {
        teacher_id: teacher,
        student_id: ids['bruno@dev.local'],
        title: 'Unidade 4: negativa',
        unit_id: 'u04',
        due_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        status: 'submitted',
        submitted_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      },
    ]);
  }
  console.warn(
    `Pronto. Logins de desenvolvimento (senha ${PASSWORD}): ${USERS.map((u) => u.email).join(', ')}`,
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
