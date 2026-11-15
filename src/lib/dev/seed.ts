import type { SupabaseClient } from '@supabase/supabase-js';
import { loadContent } from '@/lib/content/load';
import { gradeQuestion } from '@/lib/domain/grade';
import { persistResult } from '@/lib/practice/persist';

export interface DevUser {
  email: string;
  name: string;
  password: string;
  role: 'teacher' | 'admin' | 'student';
  /** simular histórico de estudo */
  history?: { units: string[]; days: number; lastDaysAgo: number; accuracy: number; seed: number };
  /** já aceitou os textos legais */
  consented?: boolean;
}

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** Cria usuários de teste, vínculo, acesso manual e histórico simulado. Idempotente. */
export async function seedDev(
  db: SupabaseClient,
  users: DevUser[],
  log: (m: string) => void = () => undefined,
) {
  const c = loadContent();
  const ids: Record<string, string> = {};
  for (const u of users) {
    const { data: found } = await db
      .from('profiles')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();
    let id = (found as { id: string } | null)?.id;
    if (!id) {
      const { data, error } = await db.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });
      if (error || !data.user) throw new Error(`createUser ${u.email}: ${error?.message}`);
      id = data.user.id;
    }
    ids[u.email] = id;
    await db.from('profiles').update({ role: u.role, full_name: u.name }).eq('id', id);
  }
  const teacher = users.find((u) => u.role !== 'student');
  const usable = c.questions.filter(
    (q) => !q.needs_review && q.unit && !['speak', 'dictation', 'match_pairs'].includes(q.type),
  );

  for (const u of users.filter((x) => x.role === 'student')) {
    const sid = ids[u.email]!;
    if (teacher)
      await db
        .from('teacher_students')
        .upsert({ teacher_id: ids[teacher.email]!, student_id: sid });
    await db
      .from('subscriptions')
      .upsert(
        {
          student_id: sid,
          status: 'active',
          origin: 'manual',
          external_id: `manual-${sid}`,
          valid_until: null,
        },
        { onConflict: 'origin,external_id' },
      );
    if (u.consented) {
      const { count } = await db
        .from('consents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sid);
      if (!count)
        await db.from('consents').insert([
          { user_id: sid, kind: 'privacy', version: 0 },
          { user_id: sid, kind: 'terms', version: 0 },
          { user_id: sid, kind: 'age_notice', version: 1 },
        ]);
    }
    const h = u.history;
    if (!h) continue;
    const { count } = await db
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', sid);
    if ((count ?? 0) > 0) continue;
    const rand = rng(h.seed);
    const pool = usable.filter((q) => h.units.includes(q.unit!));
    for (let d = h.days; d >= h.lastDaysAgo; d--) {
      if (rand() < 0.2) continue;
      const when = new Date(
        Math.min(
          Date.now() - d * 86_400_000 + 12 * 3_600_000,
          Date.now() - 2 * 3_600_000 - 8 * 60_000,
        ),
      );
      for (let n = 0; n < 8; n++) {
        const q = pool[Math.floor(rand() * pool.length)]!;
        const ok = rand() < h.accuracy;
        const response = ok
          ? q.answers[0]!
          : q.type === 'multiple_choice'
            ? (q.choices?.find((x) => x !== q.answers[0]) ?? 'x')
            : 'resposta errada';
        await persistResult(db, {
          studentId: sid,
          itemId: q.id,
          itemKind: 'question',
          unit: q.unit,
          skill: q.skill,
          tags: q.error_tags,
          grade: gradeQuestion(q, response),
          response,
          elapsedMs: 4000 + Math.floor(rand() * 9000),
          now: new Date(when.getTime() + n * 60_000),
        });
      }
    }
    log(`${u.email}: histórico simulado criado`);
  }

  if (teacher) {
    const tid = ids[teacher.email]!;
    const { count } = await db
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', tid);
    const student = users.find((u) => u.role === 'student');
    if (!count && student) {
      await db.from('assignments').insert({
        teacher_id: tid,
        student_id: ids[student.email]!,
        title: 'Unidade 3: números e viagens',
        unit_id: 'u03',
        due_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      });
    }
  }
  return ids;
}
