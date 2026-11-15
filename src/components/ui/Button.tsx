import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const styles: Record<Variant, string> = {
  primary: 'bg-brand-blue text-white hover:bg-brand-blue-dark',
  secondary: 'border border-brand-blue bg-white text-brand-blue hover:bg-brand-tint',
  ghost: 'text-brand-blue hover:bg-brand-tint',
  danger: 'border border-brand-red-text bg-white text-brand-red-text hover:bg-danger-bg',
};
const base = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold no-underline transition disabled:cursor-not-allowed disabled:opacity-50';

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

export function LinkButton({ href, variant = 'primary', className = '', children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${styles[variant]} hover:no-underline ${variant === 'primary' ? 'text-white' : ''} ${className}`}>
      {children}
    </Link>
  );
}
