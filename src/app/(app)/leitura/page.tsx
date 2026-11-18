import { LevelGrid } from '@/components/library/LevelGrid';
import { PageHeader } from '@/components/ui/PageHeader';
import { AREA_LEVELS } from '@/lib/content/levels';
import { readings } from '@/lib/content/static';
import { getLibraryMeta } from '@/lib/data/content';
import { loadSeen } from '@/lib/data/seen';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Leitura' };
export const dynamic = 'force-dynamic';

export default async function Leitura() {
  const me = await requireStudent();
  const db = await serverClient();
  const [meta, seen] = await Promise.all([getLibraryMeta(db, 'leitura'), loadSeen(db, me.id)]);
  const cards = AREA_LEVELS.leitura.map((level) => {
    const texts = readings.filter((r) => r.level === level);
    const read = texts.filter((r) => {
      const qs = meta.filter((m) => m.reading === r.id);
      return qs.length > 0 && qs.every((m) => seen.seen.has(m.id));
    }).length;
    return { level, count: texts.length, detail: `${read} de ${texts.length} textos lidos` };
  });
  return (
    <>
      <PageHeader
        title="Leitura"
        subtitle="Escolha o seu nível, leia o texto, ouça o áudio e responda às perguntas."
      />
      <LevelGrid base="/leitura" cards={cards} />
    </>
  );
}
