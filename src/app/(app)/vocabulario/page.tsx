import { LevelGrid } from '@/components/library/LevelGrid';
import { PageHeader } from '@/components/ui/PageHeader';
import { AREA_LEVELS } from '@/lib/content/levels';
import { getLibraryMeta } from '@/lib/data/content';
import { loadSeen } from '@/lib/data/seen';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Vocabulário' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const me = await requireStudent();
  const db = await serverClient();
  const [meta, seen] = await Promise.all([getLibraryMeta(db, 'vocabulario'), loadSeen(db, me.id)]);
  const cards = AREA_LEVELS.vocabulario.map((level) => {
    const all = meta.filter((m) => m.cefr === level);
    const done = all.filter((m) => seen.seen.has(m.id)).length;
    return { level, count: all.length, detail: `${done} de ${all.length} palavras feitas` };
  });
  return (
    <>
      <PageHeader
        title="Vocabulário"
        subtitle="Palavras soltas em francês: ouça e escolha o significado em português."
      />
      <LevelGrid base="/vocabulario" cards={cards} />
    </>
  );
}
