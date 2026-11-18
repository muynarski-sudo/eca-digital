import type { ReactNode } from 'react';
import { TricolorBar } from './TricolorBar';

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="pattern-header rounded-card border border-line px-4 py-4 md:px-5 md:py-6">
      <h1 className="text-xl md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-soft md:text-base">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
export { TricolorBar };
