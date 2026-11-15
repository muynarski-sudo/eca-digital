import type { ReactNode } from 'react';
import { TricolorBar } from '@/components/ui/TricolorBar';

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <TricolorBar />
      <main id="conteudo" className="pattern-header flex flex-1 items-start justify-center px-4 py-10 md:items-center">
        <div className="w-full max-w-md space-y-5 rounded-card border border-line bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-brand-red-text">Falando Francês Prática</p>
            <h1 className="mt-1 text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-ink-soft">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
