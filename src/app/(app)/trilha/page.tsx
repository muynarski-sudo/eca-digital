import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { unitsAll } from '@/lib/content/static';
import { loadStageData } from '@/lib/data/stages';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Trilha' };
export const dynamic = 'force-dynamic';

export default async function Trilha() {
  const me = await requireStudent();
  const { views } = await loadStageData(await serverClient(), me.id, me.role);
  const done = views.filter((v) => v.state === 'done').length;
  const current = views.find((v) => v.state === 'open');
  const chapters = unitsAll
    .map((u) => ({ unit: u, items: views.filter((v) => v.stage.unit === u.id) }))
    .filter((c) => c.items.length > 0);

  return (
    <>
      <PageHeader
        title={`Trilha ${me.level}`}
        subtitle="Um assunto por nível. Termine todas as questões, veja a pontuação e o próximo nível abre."
      />

      <Card tone="tint" className="space-y-3" aria-label="Seu progresso na trilha">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold text-brand-blue-dark">
            {done} de {views.length} níveis concluídos
          </p>
          <p className="text-sm text-ink-soft">{Math.round((done / views.length) * 100)}%</p>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={views.length}
          aria-valuenow={done}
          aria-label="Níveis concluídos"
        >
          <div
            className="h-full rounded-full bg-brand-blue"
            style={{ width: `${(done / views.length) * 100}%` }}
          />
        </div>
        {current && (
          <Link
            href={`/nivel/${current.stage.id}`}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-brand-blue px-4 py-3 text-white no-underline hover:bg-brand-blue-dark hover:no-underline"
          >
            <span>
              <span className="block text-xs font-bold uppercase tracking-wide text-white/80">
                {current.stat.answered ? 'Continue de onde parou' : 'Próximo nível'}
              </span>
              <span className="block text-lg font-bold">
                Nível {current.number}: {current.stage.title}
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl">
              →
            </span>
          </Link>
        )}
      </Card>

      {chapters.map((c) => {
        const cdone = c.items.filter((v) => v.state === 'done').length;
        return (
          <section key={c.unit.id} aria-labelledby={`cap-${c.unit.id}`} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`cap-${c.unit.id}`} className="text-lg">
                Capítulo {c.unit.order}: {c.unit.title}
              </h2>
              <p className="shrink-0 text-sm text-ink-muted">
                {cdone} de {c.items.length}
              </p>
            </div>
            <ol className="overflow-hidden rounded-card border border-line bg-white">
              {c.items.map((v) => {
                const row = (
                  <div className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        v.state === 'done'
                          ? 'bg-success-bg text-success-text'
                          : v.state === 'open'
                            ? 'bg-brand-blue text-white'
                            : 'bg-surface text-ink-muted'
                      }`}
                    >
                      {v.state === 'done' ? '✓' : v.state === 'locked' ? '🔒' : v.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-bold ${v.state === 'locked' ? 'text-ink-muted' : 'text-brand-blue-dark'}`}
                      >
                        {v.stage.title}
                      </span>
                      <span className="block truncate text-sm text-ink-soft">
                        {v.state === 'locked'
                          ? 'Conclua o nível anterior para abrir'
                          : v.state === 'done'
                            ? `Concluído · pontuação ${v.stat.score}%`
                            : v.stat.answered
                              ? `${v.stat.answered} de ${v.stat.total} questões`
                              : v.stage.hint}
                      </span>
                    </span>
                    {v.state !== 'locked' && (
                      <span aria-hidden="true" className="text-xl text-brand-blue">
                        ›
                      </span>
                    )}
                  </div>
                );
                return (
                  <li key={v.stage.id} className="border-b border-line last:border-b-0">
                    {v.state === 'locked' ? (
                      <div aria-label={`Nível ${v.number}, ${v.stage.title}, bloqueado`}>{row}</div>
                    ) : (
                      <Link
                        href={`/nivel/${v.stage.id}`}
                        className="block no-underline hover:bg-brand-tint hover:no-underline"
                        aria-label={`Nível ${v.number}: ${v.stage.title}. ${v.state === 'done' ? `Concluído, ${v.stat.score}%` : `${v.stat.answered} de ${v.stat.total} questões`}`}
                      >
                        {row}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
