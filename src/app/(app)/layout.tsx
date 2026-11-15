import { Shell } from '@/components/Shell';
import { redirect } from 'next/navigation';
import { hasAcceptedTerms } from '@/lib/legal/consent';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

const NAV = [
  { href: '/inicio', label: 'Início' },
  { href: '/trilha', label: 'Trilha' },
  { href: '/flashcards', label: 'Flashcards' },
  { href: '/conjugacao', label: 'Conjugação' },
  { href: '/brincar', label: 'Brincar' },
  { href: '/evolucao', label: 'Evolução' },
  { href: '/conversa', label: 'Conversa' },
  { href: '/meus-dados', label: 'Meus dados' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStudent();
  if (me.role === 'student' && !(await hasAcceptedTerms(await serverClient(), me.id)))
    redirect('/aceite');
  return (
    <Shell
      nav={
        me.role === 'student'
          ? NAV
          : [...NAV, { href: '/professora', label: 'Painel da professora' }]
      }
      name={me.fullName ?? me.email}
    >
      {children}
    </Shell>
  );
}
