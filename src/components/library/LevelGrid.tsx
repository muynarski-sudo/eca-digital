import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CEFR_INFO } from '@/lib/content/labels';

export interface LevelCard {
  level: string;
  /** texto curto de progresso, por exemplo "3 de 6 textos lidos" */
  detail: string;
  count: number;
}

/** Grade de níveis (A1 a C2) como a do lingua.com: o aluno escolhe o nível e entra. */
export function LevelGrid({ base, cards }: { base: string; cards: LevelCard[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const info = CEFR_INFO[c.level]!;
        return (
          <li key={c.level}>
            <Link
              href={`${base}/${c.level.toLowerCase()}`}
              className="block h-full no-underline"
              aria-label={`Nível ${c.level}, ${info.name}. ${c.detail}`}
            >
              <Card className="h-full space-y-2 transition hover:border-brand-blue hover:shadow-md">
                <p className="text-3xl font-bold text-brand-blue-dark">{c.level}</p>
                <p className="font-bold">{info.name}</p>
                <p className="text-ink-soft">{info.hint}</p>
                <p className="text-sm font-bold text-brand-blue">{c.detail}</p>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
