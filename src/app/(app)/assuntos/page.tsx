import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { LEVEL_LABELS, TOPIC_INFO } from '@/lib/content/labels';
import { TOPICS } from '@/lib/content/schema';
import { getQuestionMeta } from '@/lib/data/content';
import { loadProgress } from '@/lib/data/progress';
import { loadSeen } from '@/lib/data/seen';
import { levelFor } from '@/lib/domain/level';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Assuntos' };
export const dynamic = 'force-dynamic';

const AUDIO = new Set(['dictation', 'speak']);

export default async function Assuntos() {
  const me = await requireStudent();
  const db = await serverClient();
  const [progress, meta, seen] = await Promise.all([
    loadProgress(db, me.id, me.level),
    getQuestionMeta(db),
    loadSeen(db, me.id),
  ]);
  const open = new Set(progress.units.filter((u) => u.state !== 'locked').map((u) => u.unit.id));
  const rows = TOPICS.map((t) => {
    const all = meta.filter((q) => q.topic === t && !AUDIO.has(q.type));
    const avail = all.filter((q) => q.unit === null || open.has(q.unit));
    const unseen = avail.filter((q) => !seen.seen.has(q.id)).length;
    return { t, total: all.length, avail: avail.length, unseen, level: levelFor(avail, seen.seen) };
  }).filter((r) => r.total > 0);

  return (
    <>
      <PageHeader
        title="Assuntos"
        subtitle="Escolha o que você quer praticar. Dentro de cada assunto as perguntas começam fáceis e vão ficando mais difíceis."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const info = TOPIC_INFO[r.t]!;
          const locked = r.avail === 0;
          return (
            <li key={r.t}>
              <Card as="section" aria-labelledby={`t-${r.t}`} className="space-y-3">
                <h2 id={`t-${r.t}`} className="text-xl">
                  <span aria-hidden="true">{info.icon} </span>
                  {info.label}
                </h2>
                <p className="text-ink-soft">{info.hint}</p>
                {locked ? (
                  <p className="font-bold text-ink-muted">
                    <span aria-hidden="true">🔒 </span>Libera quando você avançar na trilha.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">
                      {r.unseen} perguntas novas · você está no nível{' '}
                      <strong>
                        {r.level} ({LEVEL_LABELS[r.level]})
                      </strong>
                      {r.avail < r.total && ` · mais ${r.total - r.avail} liberam na trilha`}
                    </p>
                    <p className="flex flex-wrap gap-2">
                      <Link
                        href={`/praticar?assunto=${r.t}`}
                        className="rounded-xl bg-brand-blue px-4 py-2 font-bold text-white no-underline"
                      >
                        Praticar no meu nível
                      </Link>
                      {([1, 2, 3] as const).map((n) => (
                        <Link
                          key={n}
                          href={`/praticar?assunto=${r.t}&nivel=${n}`}
                          className="rounded-xl border-2 border-line px-3 py-2 text-sm font-bold"
                        >
                          {LEVEL_LABELS[n]}
                        </Link>
                      ))}
                    </p>
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
