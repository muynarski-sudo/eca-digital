import { Shell } from '@/components/Shell';
import { requireStaff } from '@/lib/session';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const nav = [
    { href: '/professora', label: 'Alunos' },
    { href: '/professora/tarefas', label: 'Tarefas' },
    { href: '/professora/resumo', label: 'Resumo semanal' },
    { href: '/professora/convidar', label: 'Convidar aluno' },
    ...(me.role === 'admin'
      ? [
          { href: '/admin', label: 'Métricas' },
          { href: '/admin/conteudo', label: 'Conteúdo' },
          { href: '/admin/documentos', label: 'Documentos legais' },
        ]
      : []),
    { href: '/inicio', label: 'Ver como aluno' },
  ];
  return (
    <Shell
      nav={nav}
      name={me.fullName ?? me.email}
      badge={me.role === 'admin' ? 'admin' : 'professora'}
    >
      {children}
    </Shell>
  );
}
