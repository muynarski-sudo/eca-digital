import { NextResponse } from 'next/server';
import { toCsv } from '@/lib/staff/csv';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VERDICT = { correct: 'certa', almost: 'quase', wrong: 'errada' } as const;

/** Registro de atividades dos alunos em CSV. A RLS decide o que cada pessoa vê: a instrutora vê os alunos dela, a admin vê todos. */
export async function GET(req: Request) {
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const { data: me } = await db.from('profiles').select('role').eq('id', auth.user.id).single();
  if (!me || me.role === 'student')
    return NextResponse.json({ error: 'acesso restrito à equipe' }, { status: 403 });

  const u = new URL(req.url);
  const aluno = u.searchParams.get('aluno');
  const dias = Math.min(3650, Math.max(1, Number(u.searchParams.get('dias') ?? 90) || 90));
  const since = new Date(Date.now() - dias * 86_400_000).toISOString();

  let q = db
    .from('attempts')
    .select(
      'student_id,question_id,verdict,response,elapsed_ms,error_tags,assignment_id,created_at',
    )
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20000);
  if (aluno && /^[0-9a-f-]{36}$/i.test(aluno)) q = q.eq('student_id', aluno);
  const { data: attempts, error } = await q;
  if (error) return NextResponse.json({ error: 'falha ao ler' }, { status: 500 });
  const rows = (attempts ?? []) as Array<{
    student_id: string;
    question_id: string;
    verdict: keyof typeof VERDICT;
    response: string | null;
    elapsed_ms: number;
    error_tags: string[];
    assignment_id: string | null;
    created_at: string;
  }>;

  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const qIds = [...new Set(rows.map((r) => r.question_id).filter((id) => !id.startsWith('conj:')))];
  const [{ data: ps }, qs] = await Promise.all([
    studentIds.length
      ? db.from('profiles').select('id,full_name,email').in('id', studentIds)
      : { data: [] },
    (async () => {
      const out = new Map<string, { prompt: string; type: string }>();
      for (let i = 0; i < qIds.length; i += 200) {
        const { data } = await db
          .from('questions')
          .select('id,prompt,type')
          .in('id', qIds.slice(i, i + 200));
        for (const x of (data ?? []) as Array<{ id: string; prompt: string; type: string }>)
          out.set(x.id, x);
      }
      return out;
    })(),
  ]);
  const who = new Map(
    ((ps ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((p) => [
      p.id,
      p,
    ]),
  );
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const csv = toCsv(
    [
      'data_hora',
      'aluno',
      'email',
      'questao',
      'tipo',
      'enunciado',
      'resultado',
      'resposta_do_aluno',
      'tempo_s',
      'pontos_fracos',
      'tarefa',
    ],
    rows.map((r) => [
      fmt.format(new Date(r.created_at)),
      who.get(r.student_id)?.full_name ?? '',
      who.get(r.student_id)?.email ?? '',
      r.question_id,
      qs.get(r.question_id)?.type ?? (r.question_id.startsWith('conj:') ? 'conjugacao' : ''),
      qs.get(r.question_id)?.prompt ?? '',
      VERDICT[r.verdict] ?? r.verdict,
      r.response ?? '',
      Math.round((r.elapsed_ms ?? 0) / 100) / 10,
      (r.error_tags ?? []).join(', '),
      r.assignment_id ? 'sim' : '',
    ]),
  );
  const name = `atividades-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
