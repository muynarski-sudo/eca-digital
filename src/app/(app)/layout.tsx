import { Shell } from '@/components/Shell';
import { requireStudent } from '@/lib/session';

const NAV = [
  { href: '/inicio', label: 'Início' },
  { href: '/trilha', label: 'Trilha' },
  { href: '/flashcards', label: 'Flashcards' },
  { href: '/conjugacao', label: 'Conjugação' },
  { href: '/evolucao', label: 'Evolução' },
  { href: '/conversa', label: 'Conversa' },
  { href: '/meus-dados', label: 'Meus dados' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStudent();
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
