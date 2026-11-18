import { notFound, redirect } from 'next/navigation';
import { AudioButton } from '@/components/ui/AudioButton';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { MasteryBadge } from '@/components/ui/MasteryBadge';
import { FrenchLine } from '@/components/ui/Pron';
import { PageHeader } from '@/components/ui/PageHeader';
import { audioKey } from '@/lib/audio/key';
import { categoryLabel } from '@/lib/content/labels';
import { cultureTips, dialogues, phrases } from '@/lib/content/static';
import { getVocab } from '@/lib/data/content';
import { loadProgress } from '@/lib/data/progress';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Unidade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStudent();
  const db = await serverClient();
  const progress = await loadProgress(db, me.id, me.level);
  const view = progress.units.find((u) => u.unit.id === id);
  if (!view) notFound();
  if (view.state === 'locked' && me.role === 'student') redirect('/trilha');
  const vocab = await getVocab(db, { unit: id });
  const categories = [...new Set(vocab.map((v) => v.category))];
  const tips = cultureTips.filter((t) => t.unit === id);
  const dlgs = dialogues.filter((d) => d.unit === id);
  const sample = phrases.filter((p) => p.unit === id).slice(0, 6);

  return (
    <>
      <PageHeader
        title={`Unidade ${view.unit.order}: ${view.unit.title}`}
        subtitle={view.unit.objective}
      >
        <div className="flex flex-wrap items-center gap-3">
          <MasteryBadge value={view.mastery} />
          <LinkButton href="/trilha">Praticar nos níveis da trilha</LinkButton>
          <LinkButton href={`/flashcards?unidade=${id}`} variant="secondary">
            Flashcards
          </LinkButton>
        </div>
      </PageHeader>

      {tips.map((t) => (
        <Card key={t.id} tone="tint" as="aside" aria-label="Dica cultural">
          <p className="font-bold text-brand-blue-dark">Dica cultural: {t.title}</p>
          <p>{t.text}</p>
        </Card>
      ))}

      <section aria-labelledby="vocab" className="space-y-3">
        <h2 id="vocab" className="text-xl">
          Vocabulário
        </h2>
        {vocab.length === 0 && (
          <p className="text-ink-soft">Esta unidade não tem lista de vocabulário.</p>
        )}
        {categories.map((c) => (
          <Card key={c} className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">
              {categoryLabel(c)}
            </h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {vocab
                .filter((v) => v.category === c)
                .map((v) => (
                  <li
                    key={v.id}
                    className="flex items-start justify-between gap-2 border-b border-line pb-2"
                  >
                    <div>
                      <FrenchLine fr={v.fr} pt={v.pt} pron={v.pron} />
                      {v.example && (
                        <p className="text-sm text-ink-muted" lang="fr">
                          {v.example.fr} <span lang="pt-BR">· {v.example.pt}</span>
                        </p>
                      )}
                    </div>
                    <AudioButton audioKey={audioKey(v.fr)} fallbackText={v.fr} label="Ouvir" />
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </section>

      {sample.length > 0 && (
        <section aria-labelledby="frases" className="space-y-3">
          <h2 id="frases" className="text-xl">
            Frases úteis
          </h2>
          <Card className="space-y-3">
            {sample.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-2">
                <FrenchLine fr={p.fr} pt={p.pt} pron={p.pron} />
                <AudioButton audioKey={audioKey(p.fr)} fallbackText={p.fr} />
              </div>
            ))}
          </Card>
        </section>
      )}

      {dlgs.map((d) => (
        <section key={d.id} aria-label={`Diálogo: ${d.title}`} className="space-y-3">
          <h2 className="text-xl">Diálogo: {d.title}</h2>
          <Card className="space-y-3">
            {d.scene && <p className="text-ink-muted">{d.scene}</p>}
            {d.lines.map((l, i) => (
              <div key={i}>
                <p className="text-sm font-bold text-brand-red-text">{l.speaker}</p>
                <FrenchLine fr={l.fr} pt={l.pt} pron={l.pron} />
              </div>
            ))}
            {d.source === 'generated' && (
              <p className="text-sm text-ink-muted">
                Tradução acrescentada pela plataforma, em revisão.
              </p>
            )}
          </Card>
        </section>
      ))}
    </>
  );
}
