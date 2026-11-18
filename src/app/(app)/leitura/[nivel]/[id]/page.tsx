import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReadingAudio } from '@/components/library/ReadingAudio';
import { ReadingQuiz } from '@/components/library/ReadingQuiz';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { parseLevel } from '@/lib/content/levels';
import { readings } from '@/lib/content/static';
import { getQuestionsOfReading } from '@/lib/data/content';
import { toPublic } from '@/lib/practice/public';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Texto({
  params,
}: {
  params: Promise<{ nivel: string; id: string }>;
}) {
  const p = await params;
  const level = parseLevel(p.nivel, 'leitura');
  const reading = readings.find((r) => r.id === p.id && r.level === level);
  if (!level || !reading) notFound();
  await requireStudent();
  const db = await serverClient();
  const qs = (await getQuestionsOfReading(db, reading.id)).map(toPublic);
  return (
    <>
      <PageHeader title={reading.title} subtitle={`Leitura ${level} · ${reading.title_pt}`} />
      <p>
        <Link href={`/leitura/${level.toLowerCase()}`}>← Textos do nível {level}</Link>
      </p>
      <Card as="article" aria-label="Texto" className="space-y-4 text-lg leading-relaxed">
        {reading.paragraphs.map((t, i) => (
          <p key={i} lang="fr">
            {t}
          </p>
        ))}
      </Card>
      <Card tone="tint" className="space-y-2">
        <h2 className="text-xl">Ouvir o texto</h2>
        <ReadingAudio src={`/audio/reading/${reading.id}.mp3`} />
      </Card>
      <ReadingQuiz key={reading.id} questions={qs} />
    </>
  );
}
