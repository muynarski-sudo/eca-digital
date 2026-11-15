import Link from 'next/link';
import { Badge, MasteryBadge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { loadProgress } from '@/lib/data/progress';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Trilha' };
export const dynamic = 'force-dynamic';

export default async function Trilha() {
  const me = await requireStudent();
  const progress = await loadProgress(await serverClient(), me.id, me.level);
  return (
    <>
      <PageHeader title={`Trilha ${me.level}`} subtitle="Dominando 70% de uma unidade, a próxima se abre. A professora também pode liberar." />
      <ol className="grid gap-4 md:grid-cols-2">
        {progress.units.map((u) => (
          <li key={u.unit.id}>
            <Card className={`h-full space-y-2 ${u.state === 'locked' ? 'bg-surface' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink-muted">Unidade {u.unit.order}</p>
                {u.state === 'locked' && <Badge kind="neutral">🔒 Bloqueada</Badge>}
                {u.state === 'in_progress' && <Badge kind="info">Em andamento</Badge>}
                {u.state === 'mastered' && <Badge kind="success">Dominada</Badge>}
              </div>
              <h2 className="text-lg">{u.unit.title}</h2>
              <p className="text-ink-soft">{u.unit.objective}</p>
              {u.state !== 'locked' ? (
                <>
                  <MasteryBadge value={u.mastery} />
                  <Link href={`/unidade/${u.unit.id}`} className="inline-block font-bold">Abrir unidade →</Link>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Abre quando você dominar 70% da unidade anterior.</p>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
