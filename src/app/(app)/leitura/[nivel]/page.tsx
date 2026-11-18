import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { CEFR_INFO } from '@/lib/content/labels';
import { parseLevel } from '@/lib/content/levels';
import { readings } from '@/lib/content/static';
import { getLibraryMeta } from '@/lib/data/content';
import { loadSeen } from '@/lib/data/seen';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LeituraNivel({ params }: { params: Promise<{ nivel: string }> }) {
  const level = parseLevel((await params).nivel, 'leitura');
  if (!level) notFound();
  const me = await requireStudent();
  const db = await serverClient();
  const [meta, seen] = await Promise.all([
    getLibraryMeta(db, 'leitura', level),
    loadSeen(db, me.id),
  ]);
  const list = readings.filter((r) => r.level === level);
  return (
    <>
      <PageHeader
        title={`Leitura ${level}, ${CEFR_INFO[level]!.name}`}
        subtitle="Escolha um texto."
      />
      <p>
        <Link href="/leitura">← Todos os níveis</Link>
      </p>
      {level !== 'A1' && (
        <Card tone="tint" className="text-sm">
          Textos extras, além do e-book. Foram escritos para esta plataforma e aguardam revisão de
          uma pessoa nativa.
        </Card>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((r) => {
          const qs = meta.filter((m) => m.reading === r.id);
          const done = qs.length > 0 && qs.every((m) => seen.seen.has(m.id));
          return (
            <li key={r.id}>
              <Link
                href={`/leitura/${level.toLowerCase()}/${r.id}`}
                className="block h-full no-underline"
              >
                <Card className="h-full space-y-1 hover:border-brand-blue hover:shadow-md">
                  <p className="text-xl font-bold text-brand-blue-dark" lang="fr">
                    {r.title}
                  </p>
                  <p className="text-ink-soft">{r.title_pt}</p>
                  <p className="text-sm font-bold text-brand-blue">
                    {done ? '✓ Lido' : `${qs.length} perguntas`}
                  </p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
