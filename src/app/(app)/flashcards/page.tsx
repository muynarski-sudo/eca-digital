import { Flashcards } from '@/components/practice/Flashcards';
import { PageHeader } from '@/components/ui/PageHeader';
import { audioKey } from '@/lib/audio/key';
import { getVocab } from '@/lib/data/content';
import { loadProgress } from '@/lib/data/progress';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Flashcards' };
export const dynamic = 'force-dynamic';

export default async function FlashcardsPage({ searchParams }: { searchParams: Promise<{ unidade?: string }> }) {
  const { unidade } = await searchParams;
  const me = await requireStudent();
  const db = await serverClient();
  const progress = await loadProgress(db, me.id, me.level);
  const openUnits = new Set(progress.units.filter((u) => u.state !== 'locked').map((u) => u.unit.id));
  const nowIso = new Date().toISOString();

  const { data: due } = await db.from('srs_cards').select('item_id').eq('student_id', me.id).eq('item_kind', 'vocab').lte('due_at', nowIso).order('due_at').limit(20);
  const { data: known } = await db.from('srs_cards').select('item_id').eq('student_id', me.id).eq('item_kind', 'vocab');
  const knownIds = new Set((known ?? []).map((r) => r.item_id as string));

  const dueVocab = (due ?? []).length ? await getVocab(db, { ids: (due ?? []).map((r) => r.item_id as string) }) : [];
  const pool = await getVocab(db, unidade ? { unit: unidade } : {});
  const fresh = pool.filter((v) => !knownIds.has(v.id) && openUnits.has(v.unit) && v.category !== 'numeros' && v.category !== 'alfabeto').slice(0, Math.max(0, 15 - dueVocab.length));
  const cards = [...dueVocab, ...fresh].map((v) => ({ id: v.id, fr: v.fr, pt: v.pt, pron: v.pron, example: v.example, audioKey: audioKey(v.fr) }));

  return (
    <>
      <PageHeader title="Flashcards" subtitle={`${dueVocab.length} para revisar e ${fresh.length} novos. Avalie com sinceridade: é assim que o espaçamento funciona.`} />
      <Flashcards cards={cards} backHref={unidade ? `/unidade/${unidade}` : '/inicio'} />
    </>
  );
}
