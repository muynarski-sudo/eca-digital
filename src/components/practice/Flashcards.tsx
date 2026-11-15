'use client';
import { useState, useTransition } from 'react';
import { reviewFlashcard } from '@/lib/actions/practice';
import { AudioButton } from '@/components/ui/AudioButton';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExerciseShell } from './ExerciseShell';

export interface FlashCard {
  id: string;
  fr: string;
  pt: string;
  pron?: string;
  example?: { fr: string; pt: string };
  audioKey: string;
}

const RATINGS = [
  { q: 1, label: 'Errei', hint: 'volta amanhã' },
  { q: 3, label: 'Difícil', hint: 'volta logo' },
  { q: 4, label: 'Bom', hint: 'espaça mais' },
  { q: 5, label: 'Fácil', hint: 'espaça bem mais' },
];

export function Flashcards({ cards, backHref }: { cards: FlashCard[]; backHref: string }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [t0, setT0] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = cards[i];

  if (cards.length === 0)
    return (
      <Card tone="tint" className="text-center">
        <p className="font-bold">Nenhum cartão para hoje.</p>
        <p className="text-ink-soft">Volte amanhã ou escolha uma unidade na trilha.</p>
      </Card>
    );
  if (!c)
    return (
      <Card tone="tint" className="space-y-3 text-center">
        <h2 className="text-2xl">Voilà, bravo!</h2>
        <p>Você revisou {cards.length} cartões. Eles voltam no momento certo.</p>
        <div className="flex justify-center">
          <LinkButton href={backHref}>Voltar</LinkButton>
        </div>
      </Card>
    );

  const rate = (q: number) =>
    start(async () => {
      setError(null);
      try {
        await reviewFlashcard({ vocabId: c.id, quality: q, elapsedMs: Date.now() - t0 });
        setShown(false);
        setT0(Date.now());
        setI((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      }
    });

  return (
    <ExerciseShell index={i} total={cards.length} title="Flashcards">
      <div className="space-y-3 text-center">
        <p lang="fr" className="text-3xl font-bold text-brand-blue-dark">
          {c.fr}
        </p>
        <AudioButton audioKey={c.audioKey} fallbackText={c.fr} />
        {shown ? (
          <div className="space-y-1" aria-live="polite">
            {c.pron && <p className="text-ink-muted">({c.pron})</p>}
            <p className="text-xl">{c.pt}</p>
            {c.example && (
              <p className="text-sm text-ink-soft" lang="fr">
                {c.example.fr} · <span lang="pt-BR">{c.example.pt}</span>
              </p>
            )}
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setShown(true)}>
            Mostrar tradução
          </Button>
        )}
      </div>
      {shown && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {RATINGS.map((r) => (
            <Button
              key={r.q}
              variant={r.q === 1 ? 'danger' : r.q === 5 ? 'primary' : 'secondary'}
              disabled={pending}
              onClick={() => rate(r.q)}
              className="flex-col"
            >
              <span>
                {r.q === 1 && <span aria-hidden="true">✗ </span>}
                {r.label}
              </span>
              <span className="text-xs font-normal opacity-80">{r.hint}</span>
            </Button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="font-bold text-brand-red-text">
          <span aria-hidden="true">✗ </span>
          {error}
        </p>
      )}
    </ExerciseShell>
  );
}
