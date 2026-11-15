import { Card } from '@/components/ui/Card';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StreakChip } from '@/components/ui/StreakChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { loadProgress } from '@/lib/data/progress';
import { tagLabel, weakTags } from '@/lib/data/weak';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Evolução' };
export const dynamic = 'force-dynamic';

const SKILLS = [['vocabulario', 'Vocabulário'], ['gramatica', 'Gramática'], ['escuta', 'Escuta'], ['fala', 'Fala']] as const;
const VERDICT = { correct: '✓ Certa', almost: '≈ Quase', wrong: '✗ Errada' } as const;

export default async function Evolucao() {
  const me = await requireStudent();
  const db = await serverClient();
  const [progress, weak, hist] = await Promise.all([
    loadProgress(db, me.id, me.level),
    weakTags(db, me.id),
    db.from('attempts').select('question_id,verdict,created_at').eq('student_id', me.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const ids = (hist.data ?? []).map((h) => h.question_id as string);
  const { data: qs } = ids.length ? await db.from('questions').select('id,prompt').in('id', ids) : { data: [] as Array<{ id: string; prompt: string }> };
  const prompt = new Map((qs ?? []).map((q) => [q.id, q.prompt]));

  return (
    <>
      <PageHeader title="Sua evolução" subtitle="O progresso é a média do domínio das unidades. Ele cai um pouco se você ficar muito tempo sem praticar." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col items-center gap-3"><ProgressRing value={progress.level} label="Progresso A1" /><StreakChip days={progress.streak} /></Card>
        <Card className="space-y-3 md:col-span-2" as="section" aria-labelledby="skills">
          <h2 id="skills" className="text-xl">Por habilidade</h2>
          <ul className="grid grid-cols-2 gap-3">
            {SKILLS.map(([k, label]) => (
              <li key={k} className="space-y-1"><p className="font-bold">{label}</p><MasteryBadge value={progress.skills[k]} /></li>
            ))}
          </ul>
        </Card>
      </div>
      <Card as="section" aria-labelledby="units" className="space-y-3">
        <h2 id="units" className="text-xl">Domínio por unidade</h2>
        <ul className="space-y-3">
          {progress.units.map((u) => (
            <li key={u.unit.id} className="grid items-center gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-bold">{u.unit.order}. {u.unit.title}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-tint" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(u.mastery * 100)} aria-label={`Domínio de ${u.unit.title}`}>
                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.round(u.mastery * 100)}%` }} />
                </div>
              </div>
              <MasteryBadge value={u.mastery} />
            </li>
          ))}
        </ul>
      </Card>
      <Card as="section" aria-labelledby="weak" className="space-y-3">
        <h2 id="weak" className="text-xl">Pontos para reforçar</h2>
        {weak.length === 0 ? <p className="text-ink-soft">Ainda não há erros suficientes para apontar pontos fracos. Continue praticando!</p> : (
          <ul className="space-y-2">{weak.map((w) => <li key={w.tag} className="flex justify-between gap-3 border-b border-line pb-2"><span>{tagLabel(w.tag)}</span><span className="text-ink-soft"><span aria-hidden="true">✗ </span>{w.errors} de {w.attempts}</span></li>)}</ul>
        )}
      </Card>
      <Card as="section" aria-labelledby="hist" className="space-y-3">
        <h2 id="hist" className="text-xl">Últimas respostas</h2>
        {(hist.data ?? []).length === 0 ? <EmptyState title="Nada por aqui ainda">Faça o treino de hoje e suas respostas aparecem aqui.</EmptyState> : (
          <ul className="space-y-2">
            {(hist.data ?? []).map((h, i) => (
              <li key={i} className="flex justify-between gap-3 border-b border-line pb-2 text-sm">
                <span className="truncate">{prompt.get(h.question_id as string) ?? 'Exercício de conjugação'}</span>
                <span className="shrink-0 font-bold">{VERDICT[h.verdict as keyof typeof VERDICT]} · {new Date(h.created_at as string).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
