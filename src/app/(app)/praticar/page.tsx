import { redirect } from 'next/navigation';
import { ExerciseRunner } from '@/components/practice/ExerciseRunner';
import { PageHeader } from '@/components/ui/PageHeader';
import { getQuestions } from '@/lib/data/content';
import { loadProgress } from '@/lib/data/progress';
import { buildDailyPlan } from '@/lib/domain/plan';
import { decayed } from '@/lib/domain/mastery';
import { toPublic } from '@/lib/practice/public';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Praticar' };
export const dynamic = 'force-dynamic';

export default async function Praticar({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; unidade?: string; tarefa?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireStudent();
  const db = await serverClient();
  const now = new Date();
  const progress = await loadProgress(db, me.id, me.level, now);
  const weakFirst = <T extends { id: string }>(list: T[]) =>
    [...list].sort((a, b) => {
      const ma = progress.itemMastery[a.id];
      const mb = progress.itemMastery[b.id];
      return (
        (ma ? decayed(ma.mastery, ma.lastPracticed, now) : 0) -
          (mb ? decayed(mb.mastery, mb.lastPracticed, now) : 0) || a.id.localeCompare(b.id)
      );
    });

  let title = 'Treino de hoje';
  let backHref = '/inicio';
  let assignmentId: string | null = null;
  let list = [] as Awaited<ReturnType<typeof getQuestions>>;

  if (sp.tarefa) {
    const { data: a } = await db
      .from('assignments')
      .select('id,title,unit_id,question_ids,status')
      .eq('id', sp.tarefa)
      .eq('student_id', me.id)
      .maybeSingle();
    if (!a) redirect('/inicio');
    title = a.title;
    assignmentId = a.id;
    const all = a.question_ids?.length
      ? await getQuestions(db, { ids: a.question_ids as string[] })
      : weakFirst(await getQuestions(db, { unit: a.unit_id as string })).slice(0, 15);
    list = all;
  } else if (sp.unidade) {
    const view = progress.units.find((u) => u.unit.id === sp.unidade);
    if (!view || (view.state === 'locked' && me.role === 'student')) redirect('/trilha');
    title = view.unit.title;
    backHref = `/unidade/${view.unit.id}`;
    list = weakFirst(await getQuestions(db, { unit: view.unit.id })).slice(0, 12);
  } else {
    const all = await getQuestions(db);
    const open = progress.units.filter((u) => u.state !== 'locked');
    const plan = buildDailyPlan({
      questions: all,
      itemMastery: progress.itemMastery,
      dueQuestionIds: progress.dueQuestionIds,
      now,
      unitMastery: Object.fromEntries(progress.units.map((u) => [u.unit.id, u.mastery])),
      openUnits: open.map((u) => u.unit.id),
    });
    const byId = new Map(all.map((q) => [q.id, q]));
    list = plan.ids.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);
    if (list.length === 0 && progress.units[0])
      list = weakFirst(
        all.filter(
          (q) =>
            q.unit === progress.units[0]!.unit.id && q.type !== 'speak' && q.type !== 'dictation',
        ),
      ).slice(0, 10);
  }

  return (
    <>
      <PageHeader title={title} subtitle="Responda com calma. O erro faz parte." />
      <ExerciseRunner
        questions={list.map(toPublic)}
        title={title}
        assignmentId={assignmentId}
        backHref={backHref}
      />
    </>
  );
}
