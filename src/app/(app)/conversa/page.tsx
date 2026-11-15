import { Conversation } from '@/components/practice/Conversation';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SCENARIOS, conversationEnabled, scenarioById } from '@/lib/conversation/scenarios';
import { requireStudent } from '@/lib/session';
import Link from 'next/link';

export const metadata = { title: 'Conversa guiada' };

export default async function Conversa({
  searchParams,
}: {
  searchParams: Promise<{ cena?: string }>;
}) {
  await requireStudent();
  const { cena } = await searchParams;
  const active = cena ? scenarioById(cena) : undefined;
  if (!conversationEnabled()) {
    return (
      <>
        <PageHeader
          title="Conversa guiada"
          subtitle="Treine situações reais: restaurante, aeroporto e direções."
        />
        <EmptyState title="Em breve por aqui">
          Este recurso ainda está desligado. Quando a professora ativar, você poderá conversar em
          francês com um assistente. Nada da conversa será guardado.
        </EmptyState>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Conversa guiada"
        subtitle={active ? active.goal : 'Escolha uma situação.'}
      />
      {active ? (
        <Conversation scenario={active.id} opening={active.opening} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((s) => (
            <li key={s.id} className="rounded-card border border-line p-4">
              <p className="font-bold">{s.title}</p>
              <p className="text-ink-soft">{s.goal}</p>
              <Link href={`/conversa?cena=${s.id}`}>Começar →</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
