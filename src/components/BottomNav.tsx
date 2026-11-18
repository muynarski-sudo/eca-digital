'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
}

/** Atalhos que ficam sempre à vista no celular (o resto vai para "Mais"). */
const PRIMARY: Array<NavItem & { icon: string; short?: string }> = [
  { href: '/inicio', label: 'Início', icon: '🏠' },
  { href: '/trilha', label: 'Trilha', icon: '🗺️' },
  { href: '/leitura', label: 'Leitura', icon: '📖' },
  { href: '/gramatica', label: 'Gramática', icon: '✏️', short: 'Gramática' },
  { href: '/vocabulario', label: 'Vocabulário', icon: '🔤', short: 'Palavras' },
];

/** Telas de exercício: modo foco, sem barra de navegação (só o exercício e o botão de sair). */
const FOCUS = [/^\/praticar/, /^\/gramatica\/[^/]+/, /^\/vocabulario\/[^/]+/, /^\/flashcards/];

export function BottomNav({ nav }: { nav: NavItem[] }) {
  const path = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (FOCUS.some((r) => r.test(path))) return null;

  const primaryHrefs = new Set(PRIMARY.map((p) => p.href));
  const more = nav.filter((n) => !primaryHrefs.has(n.href));
  const active = (href: string) => path === href || path.startsWith(href + '/');
  const moreActive = more.some((m) => active(m.href));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {open && (
        <div
          id="mais-menu"
          role="dialog"
          aria-label="Mais opções"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-white p-3 shadow-xl md:hidden"
        >
          <ul className="grid grid-cols-2 gap-2">
            {more.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  className={`flex min-h-12 items-center rounded-xl px-4 font-bold no-underline hover:no-underline ${active(m.href) ? 'bg-brand-tint text-brand-blue-dark' : 'text-brand-blue-dark hover:bg-brand-tint'}`}
                >
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-6">
          {PRIMARY.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={active(p.href) ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-bold no-underline hover:no-underline ${active(p.href) ? 'text-brand-blue-dark' : 'text-ink-soft'}`}
              >
                <span
                  aria-hidden="true"
                  className={`text-xl leading-none ${active(p.href) ? '' : 'opacity-70'}`}
                >
                  {p.icon}
                </span>
                <span className={active(p.href) ? 'border-b-2 border-brand-red' : ''}>
                  {p.short ?? p.label}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mais-menu"
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-bold ${moreActive || open ? 'text-brand-blue-dark' : 'text-ink-soft'}`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ⋯
              </span>
              <span>Mais</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
