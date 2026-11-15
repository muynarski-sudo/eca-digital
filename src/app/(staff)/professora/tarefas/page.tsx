import { GradeForm } from '@/components/GradeForm';
import { Badge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Tarefas' };
export const dynamic = 'force-dynamic';

const STATUS = { assigned: ['Atribuída', 'neutral'], in_progress: ['Em andamento', 'info'], submitted: ['Entregue, aguarda feedback', 'warn'], reviewed: ['Corrigida', 'success'] } as const;

export default async function Tarefas() {
  await requireStaff();
  const db = await serverClient();
  const { data: list } = await db.from('assignments').select('id,title,status,due_at,student_id,teacher_grade,teacher_feedback,submitted_at').order('due_at', { ascending: false }).limit(60);
  const ids = [...new Set((list ?? []).map((a) => a.student_id as string))];
  const { data: ps } = ids.length ? await db.from('profiles').select('id,full_name,email').in('id', ids) : { data: [] as Array<{ id: string; full_name: string | null; email: string }> };
  const name = new Map((ps ?? []).map((p) => [p.id, p.full_name ?? p.email]));

  // resultado por tarefa: tentativas do aluno depois da atribuição
  const results = new Map<string, { n: number; ok: number }>();
  for (const a of list ?? []) {
    const { data } = await db.from('attempts').select('score').eq('assignment_id', a.id);
    results.set(a.id as string, { n: data?.length ?? 0, ok: (data ?? []).reduce((s, r) => s + Number(r.score), 0) });
  }
  const order = { submitted: 0, in_progress: 1, assigned: 2, reviewed: 3 } as const;
  const sorted = [...(list ?? [])].sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order]);

  return (
    <>
      <PageHeader title="Tarefas de casa" subtitle="As entregues aparecem primeiro. Escreva o feedback e o aluno vê no início." />
      {sorted.length === 0 ? <EmptyState title="Nenhuma tarefa ainda">Atribua pela página de cada aluno.</EmptyState> : (
        <ul className="space-y-4">
          {sorted.map((a) => {
            const [label, kind] = STATUS[a.status as keyof typeof STATUS];
            const r = results.get(a.id as string);
            return (
              <li key={a.id as string}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-lg font-bold">{a.title as string}</p><p className="text-sm text-ink-soft">{name.get(a.student_id as string)} · prazo {new Date(a.due_at as string).toLocaleDateString('pt-BR')}</p></div>
                    <Badge kind={kind}>{label}</Badge>
                  </div>
                  {r && r.n > 0 && <p className="text-sm">Resultado: {r.n} respostas, {Math.round((r.ok / r.n) * 100)}% de acerto.</p>}
                  {(a.status === 'submitted' || a.status === 'reviewed') && <GradeForm id={a.id as string} grade={a.teacher_grade == null ? null : Number(a.teacher_grade)} feedback={a.teacher_feedback as string | null} />}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
