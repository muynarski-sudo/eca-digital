import { skillLabel } from '@/lib/domain/mastery';

const tone = {
  iniciando: 'bg-surface text-ink-soft border-line',
  'em evolução': 'bg-brand-tint text-brand-blue-dark border-brand-blue',
  sólido: 'bg-success-bg text-success-text border-success',
} as const;

/** Selo de domínio: sempre texto + ícone, nunca só cor. */
export function MasteryBadge({ value }: { value: number }) {
  const label = skillLabel(value);
  const icon = label === 'sólido' ? '✓' : label === 'em evolução' ? '↗' : '•';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-bold ${tone[label]}`}
    >
      <span aria-hidden="true">{icon}</span>
      {Math.round(value * 100)}% · {label}
    </span>
  );
}

export function Badge({
  children,
  kind = 'info',
}: {
  children: React.ReactNode;
  kind?: 'info' | 'success' | 'warn' | 'neutral';
}) {
  const k = {
    info: 'bg-brand-tint text-brand-blue-dark',
    success: 'bg-success-bg text-success-text',
    warn: 'bg-danger-bg text-brand-red-text',
    neutral: 'bg-surface text-ink-soft',
  }[kind];
  const icon = { info: 'ℹ', success: '✓', warn: '!', neutral: '' }[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${k}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
