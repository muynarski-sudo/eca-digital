import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { loadStageData } from '@/lib/data/stages';
import { retryBatch, stageList } from '@/lib/domain/stages';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Nivel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  const { views, meta, seen } = await loadStageData(await serverClient(), me.id, me.role);
  const v = views.find((x) => x.stage.id === id);
  if (!v) notFound();
  if (v.state === 'locked') redirect('/trilha');
  const next = views[v.number];
  const wrong = retryBatch(stageList(meta, id), seen, 1000).length;
  return (
    <>
      <PageHeader title={`Nível ${v.number}: ${v.stage.title}`} subtitle={v.stage.hint} />
      <p>
        <Link href="/trilha">← Todos os níveis</Link>
      </p>
      <Card tone="tint" className="space-y-3" aria-label="Pontuação do nível">
        <p className="text-lg">
          {v.stat.answered} de {v.stat.total} questões respondidas
        </p>
        {v.state === 'done' ? (
          <>
            <p className="text-3xl font-bold text-brand-blue-dark" role="status">
              Pontuação: {v.stat.score}%
            </p>
            <p className="text-ink-soft">
              {Math.round(v.stat.points * 10) / 10} de {v.stat.total} pontos. Nível concluído!
            </p>
            <div className="flex flex-wrap gap-3">
              {next && next.state !== 'locked' && (
                <LinkButton href={`/nivel/${next.stage.id}`}>
                  Próximo nível: {next.stage.title}
                </LinkButton>
              )}
              {wrong > 0 && (
                <LinkButton href={`/praticar?nivel=${id}&refazer=1`} variant="secondary">
                  Refazer as {wrong} que errei
                </LinkButton>
              )}
            </div>
          </>
        ) : (
          <LinkButton href={`/praticar?nivel=${id}`}>
            {v.stat.answered ? 'Continuar' : 'Começar'}
          </LinkButton>
        )}
      </Card>
    </>
  );
}
