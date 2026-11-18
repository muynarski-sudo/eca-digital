import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ClipButton } from '@/components/library/ClipButton';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { phrases, vocabAll } from '@/lib/content/static';
import { loadStageData } from '@/lib/data/stages';
import { retryBatch, stageList } from '@/lib/domain/stages';
import { clipKey } from '@/lib/play/clipkey';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Faixa de números de cada parte do nível de números. */
const NUMBER_RANGE: Record<string, [number, number]> = {
  'numeros-1': [0, 19],
  'numeros-2': [20, 49],
  'numeros-3': [50, 69],
  'numeros-4': [70, 99],
};

export default async function Nivel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  const { views, meta, seen } = await loadStageData(await serverClient(), me.id, me.role);
  const v = views.find((x) => x.stage.id === id);
  if (!v) notFound();
  if (v.state === 'locked') redirect('/trilha');
  const next = views[v.number];
  const wrong = retryBatch(stageList(meta, id), seen, 1000).length;
  const pct = v.stat.total ? Math.round((v.stat.answered / v.stat.total) * 100) : 0;

  const range = NUMBER_RANGE[id];
  const words = vocabAll.filter((w) => {
    if (w.stage !== id) return false;
    if (!range) return true;
    const n = Number(w.pt.replace(/\s/g, ''));
    return Number.isFinite(n) && n >= range[0] && n <= range[1];
  });
  const examples = phrases
    .filter((p) => p.stage === id && p.fr.split(' ').length <= 10)
    .slice(0, 5);

  return (
    <>
      <PageHeader title={`Nível ${v.number}: ${v.stage.title}`} subtitle={v.stage.hint} />
      <p>
        <Link href="/trilha">← Todos os níveis</Link>
      </p>
      <Card tone="tint" className="space-y-3" aria-label="Pontuação do nível">
        <div
          className="h-3 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progresso do nível"
        >
          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
        </div>
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

      {(words.length > 0 || examples.length > 0) && (
        <Card as="section" aria-labelledby="estudo" className="space-y-4">
          <div>
            <h2 id="estudo" className="text-xl">
              Antes de praticar: estude e ouça
            </h2>
            <p className="text-sm text-ink-soft">
              É o que vai aparecer nas questões deste nível. Toque em ▶ para ouvir.
            </p>
          </div>
          {words.length > 0 && (
            <ul className="divide-y divide-line">
              {words.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p lang="fr" className="font-bold text-brand-blue-dark">
                      {w.fr}
                    </p>
                    <p className="text-ink-soft">{w.pt}</p>
                    {w.pron && <p className="text-sm text-ink-muted">({w.pron})</p>}
                  </div>
                  <ClipButton src={`/audio/play/${clipKey(w.fr)}.mp3`} text={w.fr} compact />
                </li>
              ))}
            </ul>
          )}
          {examples.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-base">Frases</h3>
              <ul className="divide-y divide-line">
                {examples.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p lang="fr" className="font-bold text-brand-blue-dark">
                        {p.fr}
                      </p>
                      <p className="text-ink-soft">{p.pt}</p>
                    </div>
                    <ClipButton src={`/audio/play/${clipKey(p.fr)}.mp3`} text={p.fr} compact />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
