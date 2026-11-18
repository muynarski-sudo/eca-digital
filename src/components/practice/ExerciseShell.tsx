import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/** Moldura de um exercício: progresso, enunciado e área de resposta. */
export function ExerciseShell({
  index,
  total,
  title,
  children,
  footer,
  exitHref,
}: {
  index: number;
  total: number;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Link do botão ✕ de sair do exercício. */
  exitHref?: string;
}) {
  const pct = Math.round((index / total) * 100);
  return (
    <section aria-label="Exercício" className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 text-sm font-bold text-ink-soft">
          {exitHref && (
            <Link
              href={exitHref}
              aria-label="Sair do exercício"
              className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-soft no-underline hover:bg-brand-tint hover:no-underline"
            >
              <span aria-hidden="true">✕</span>
            </Link>
          )}
          <span className="min-w-0 flex-1 truncate">{title ?? 'Exercício'}</span>
          <span>
            {Math.min(index + 1, total)} de {total}
          </span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-brand-tint"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progresso da sessão"
        >
          <div
            className="h-full rounded-full bg-brand-blue transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Card className="space-y-4">{children}</Card>
      {footer}
    </section>
  );
}
