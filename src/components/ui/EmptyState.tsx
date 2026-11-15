import type { ReactNode } from 'react';
import { Card } from './Card';

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card tone="tint" className="text-center">
      <p className="text-lg font-bold text-brand-blue-dark">{title}</p>
      {children && <div className="mt-2 text-ink-soft">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
