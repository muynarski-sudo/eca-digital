import type { AnswerResult } from '@/lib/practice/types';

/** Feedback imediato. Acerto em verde com ícone; erro em vermelho com ícone e texto, nunca só cor. */
export function Feedback({ result }: { result: AnswerResult }) {
  const map = {
    correct: {
      icon: '✓',
      title: 'Voilà, bravo!',
      cls: 'border-success bg-success-bg text-success-text',
    },
    almost: {
      icon: '≈',
      title: 'Quase! Falta um detalhe, como um acento.',
      cls: 'border-brand-blue bg-brand-tint text-brand-blue-dark',
    },
    wrong: {
      icon: '✗',
      title: 'Ainda não, mas você chega lá.',
      cls: 'border-brand-red-text bg-danger-bg text-brand-red-text',
    },
  } as const;
  const m = map[result.verdict];
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border-2 p-4 ${m.cls}`}>
      <p className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden="true" className="text-2xl">
          {m.icon}
        </span>
        {m.title}
      </p>
      {result.verdict !== 'correct' && (
        <p className="mt-2 text-ink">
          Forma correta:{' '}
          <strong lang="fr" className="text-brand-blue-dark">
            {result.expected}
          </strong>
        </p>
      )}
      <p className="mt-2 text-ink-soft">{result.explanation}</p>
    </div>
  );
}
