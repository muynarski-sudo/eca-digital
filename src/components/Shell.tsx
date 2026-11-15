import Link from 'next/link';
import type { ReactNode } from 'react';
import { TricolorBar } from '@/components/ui/TricolorBar';
import { logout } from '@/lib/actions/auth';

interface NavItem {
  href: string;
  label: string;
}

export function Shell({
  nav,
  name,
  children,
  badge,
}: {
  nav: NavItem[];
  name: string | null;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TricolorBar />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="text-lg font-bold text-brand-blue-dark no-underline hover:no-underline"
          >
            Falando Francês <span className="text-brand-red-text">Prática</span>
            {badge && (
              <span className="ml-2 rounded-full bg-brand-tint px-2 py-0.5 text-xs text-brand-blue-dark">
                {badge}
              </span>
            )}
          </Link>
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink-soft sm:inline">{name}</span>
            <button
              className="rounded-lg px-3 py-2 font-bold text-brand-blue hover:bg-brand-tint"
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2"
        >
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 font-bold text-brand-blue-dark no-underline hover:bg-brand-tint hover:no-underline"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        {children}
      </main>
      <footer className="bg-brand-blue-dark px-4 py-6 text-sm text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3">
          <span>Bonne chance dans votre voyage linguistique!</span>
          <span className="flex gap-4">
            <Link href="/politica-de-privacidade" className="text-white underline">
              Privacidade
            </Link>
            <Link href="/termos" className="text-white underline">
              Termo de uso
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
