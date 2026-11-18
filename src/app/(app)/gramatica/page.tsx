import { LevelGrid } from '@/components/library/LevelGrid';
import { PageHeader } from '@/components/ui/PageHeader';
import { AREA_LEVELS } from '@/lib/content/levels';
import { getLibraryMeta } from '@/lib/data/content';
import { loadSeen } from '@/lib/data/seen';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Gramática' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const me = await requireStudent();
  const db = await serverClient();
  const [meta, seen] = await Promise.all([getLibraryMeta(db, 'gramatica'), loadSeen(db, me.id)]);
  const cards = AREA_LEVELS.gramatica.map((level) => {
    const all = meta.filter((m) => m.cefr === level);
    const done = all.filter((m) => seen.seen.has(m.id)).length;
    return { level, count: all.length, detail: `${done} de ${all.length} frases feitas` };
  });
  return (
    <>
      <PageHeader
        title="Gramática"
        subtitle="Escolha o seu nível e complete as frases com o verbo no tempo certo."
      />
      <LevelGrid base="/gramatica" cards={cards} />
    </>
  );
}
