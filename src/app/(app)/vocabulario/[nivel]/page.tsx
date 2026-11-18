import { notFound } from 'next/navigation';
import { ExerciseRunner } from '@/components/practice/ExerciseRunner';
import { Card } from '@/components/ui/Card';
import { CEFR_INFO } from '@/lib/content/labels';
import { parseLevel } from '@/lib/content/levels';
import { getLibraryMeta, getQuestions } from '@/lib/data/content';
import { loadSeen } from '@/lib/data/seen';
import { selectQuestions } from '@/lib/domain/select';
import { toPublic } from '@/lib/practice/public';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SIZE = 10;

export default async function Nivel({
  params,
  searchParams,
}: {
  params: Promise<{ nivel: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const level = parseLevel((await params).nivel, 'vocabulario');
  if (!level) notFound();
  const sp = await searchParams;
  const me = await requireStudent();
  const db = await serverClient();
  const [meta, seen] = await Promise.all([
    getLibraryMeta(db, 'vocabulario', level),
    loadSeen(db, me.id),
  ]);
  const ids = selectQuestions({
    pool: meta.map((m) => ({
      id: m.id,
      unit: null,
      type: m.type,
      concept: m.concept,
      difficulty: m.difficulty,
    })),
    ...seen,
    size: SIZE,
    rng: Math.random,
  });
  const full = ids.length ? await getQuestions(db, { ids }) : [];
  const byId = new Map(full.map((q) => [q.id, q]));
  const list = ids.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q);
  const title = `Vocabulário ${level}, ${CEFR_INFO[level]!.name}`;
  return (
    <>
      {level !== 'A1' && (
        <Card tone="tint" className="text-sm">
          Conteúdo extra, além do e-book. Foi escrito para esta plataforma e aguarda revisão de uma
          pessoa nativa.
        </Card>
      )}
      <ExerciseRunner
        key={`${sp.n ?? '0'}-${ids.join(',')}`}
        questions={list.map(toPublic)}
        title={title}
        backHref="/vocabulario"
        moreHref={`/vocabulario/${level.toLowerCase()}?n=${Number(sp.n ?? 0) + 1}`}
      />
    </>
  );
}
