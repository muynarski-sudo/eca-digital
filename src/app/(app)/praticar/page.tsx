import { redirect } from 'next/navigation';
import { ExerciseRunner } from '@/components/practice/ExerciseRunner';
import { PageHeader } from '@/components/ui/PageHeader';
import { getQuestionMeta, getQuestions } from '@/lib/data/content';
import { loadProgress } from '@/lib/data/progress';
import { loadSeen } from '@/lib/data/seen';
import { levelFor, type Level } from '@/lib/domain/level';
import { planDaily, planTopic, planUnit } from '@/lib/domain/plan';
import { LEVEL_LABELS, topicLabel } from '@/lib/content/labels';
import { TOPICS } from '@/lib/content/schema';
import { toPublic } from '@/lib/practice/public';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Praticar' };
export const dynamic = 'force-dynamic';

const SIZE = 10;

export default async function Praticar({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    unidade?: string;
    tarefa?: string;
    n?: string;
    assunto?: string;
    nivel?: string;
  }>;
}) {
  const sp = await searchParams;
  const me = await requireStudent();
  const db = await serverClient();
  const rng = Math.random;
  const [progress, meta, seen] = await Promise.all([
    loadProgress(db, me.id, me.level),
    getQuestionMeta(db),
    loadSeen(db, me.id),
  ]);

  let title = 'Treino de hoje';
  let backHref = '/inicio';
  let moreHref: string | null = '/praticar?modo=treino';
  let assignmentId: string | null = null;
  let ids: string[] = [];
  let level: Level | null = null;

  if (sp.tarefa) {
    const { data: a } = await db
      .from('assignments')
      .select('id,title,unit_id,question_ids,status')
      .eq('id', sp.tarefa)
      .eq('student_id', me.id)
      .maybeSingle();
    if (!a) redirect('/inicio');
    title = a.title as string;
    assignmentId = a.id as string;
    moreHref = null;
    ids = (a.question_ids as string[] | null)?.length
      ? (a.question_ids as string[])
      : planUnit({ pool: meta, ...seen, unit: a.unit_id as string, rng, size: SIZE });
  } else if (sp.assunto && (TOPICS as readonly string[]).includes(sp.assunto)) {
    const open = progress.units.filter((u) => u.state !== 'locked').map((u) => u.unit.id);
    const forced = [1, 2, 3].includes(Number(sp.nivel)) ? (Number(sp.nivel) as Level) : undefined;
    title = topicLabel(sp.assunto);
    backHref = '/assuntos';
    moreHref = `/praticar?assunto=${sp.assunto}${forced ? `&nivel=${forced}` : ''}`;
    const r = planTopic({
      pool: meta,
      ...seen,
      topic: sp.assunto,
      openUnits: open,
      rng,
      size: SIZE,
      level: forced,
    });
    ids = r.ids;
    level = r.level;
  } else if (sp.unidade) {
    const view = progress.units.find((u) => u.unit.id === sp.unidade);
    if (!view || (view.state === 'locked' && me.role === 'student')) redirect('/trilha');
    title = view.unit.title;
    backHref = `/unidade/${view.unit.id}`;
    moreHref = `/praticar?unidade=${view.unit.id}`;
    ids = planUnit({ pool: meta, ...seen, unit: view.unit.id, rng, size: SIZE });
    level = levelFor(
      meta.filter((q) => q.unit === view.unit.id),
      seen.seen,
    );
  } else {
    const open = progress.units.filter((u) => u.state !== 'locked');
    const daily = planDaily({
      pool: meta,
      ...seen,
      rng,
      size: SIZE,
      openUnits: open.map((u) => u.unit.id),
      unitMastery: Object.fromEntries(progress.units.map((u) => [u.unit.id, u.mastery])),
    });
    ids = daily.ids;
    level = daily.level;
  }

  const full = ids.length ? await getQuestions(db, { ids }) : [];
  const byId = new Map(full.map((q) => [q.id, q]));
  const list = ids.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          level
            ? `Nível ${level}, ${LEVEL_LABELS[level]}. Perguntas novas a cada vez, das mais fáceis às mais difíceis.`
            : 'Perguntas novas a cada vez. O erro faz parte.'
        }
      />
      <ExerciseRunner
        key={`${sp.n ?? '0'}-${ids.join(',')}`}
        questions={list.map(toPublic)}
        title={title}
        assignmentId={assignmentId}
        backHref={backHref}
        moreHref={moreHref}
      />
    </>
  );
}
