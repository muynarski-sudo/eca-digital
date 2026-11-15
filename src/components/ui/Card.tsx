import type { ElementType, HTMLAttributes } from 'react';

export function Card({ as, className = '', tone = 'white', ...rest }: HTMLAttributes<HTMLElement> & { as?: ElementType; tone?: 'white' | 'tint' }) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={`rounded-card border border-line p-5 shadow-sm ${tone === 'tint' ? 'bg-brand-tint' : 'bg-white'} ${className}`} {...rest} />;
}
