import Link from 'next/link';
import { Badge, MasteryBadge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { loadProgress } from '@/lib/data/progress';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Alunos' };
export const dynamic = 'force-dynamic';

export default async function Alunos({
  searchParams,
}: {
  searchParams: Promise<{ descadastrado?: string }>;
}) {
  const sp = await searchParams;
  await requireStaff();
  const db = await serverClient();
  const { data: students } = await db
    .from('profiles')
    .select('id,full_name,email,access,level')
    .eq('role', 'student')
    .order('full_name');
  const rows = await Promise.all(
    (students ?? []).map(async (s) => ({
      s,
      p: await loadProgress(db, s.id as string, s.level as string),
    })),
  );
  const days = (d: Date | null) =>
    d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000)) : null;

  return (
    <>
      <PageHeader title="Seus alunos" subtitle="Última atividade e progresso no nível.">
        <LinkButton href="/professora/cadastrar">Cadastrar aluno</LinkButton>
      </PageHeader>
      {sp.descadastrado && (
        <p
          role="status"
          className="rounded-xl border-2 border-success bg-success-bg p-3 font-bold text-success-text"
        >
          <span aria-hidden="true">✓ </span>Aluno descadastrado.
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum aluno por aqui ainda"
          action={<LinkButton href="/professora/cadastrar">Cadastrar o primeiro aluno</LinkButton>}
        >
          Você gera o e-mail e a senha, e o aluno já entra vinculado a você.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map(({ s, p }) => {
            const d = days(p.lastActivity);
            return (
              <li key={s.id as string}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/professora/alunos/${s.id}`} className="text-lg font-bold">
                      {(s.full_name as string) ?? (s.email as string)}
                    </Link>
                    <p className="text-sm text-ink-soft">{s.email as string}</p>
                    <p className="text-sm text-ink-soft">
                      {d === null
                        ? 'Ainda não praticou'
                        : d === 0
                          ? 'Praticou hoje'
                          : `Última atividade há ${d} dia${d > 1 ? 's' : ''}`}{' '}
                      · sequência: {p.streak}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.access === 'paused' && <Badge kind="warn">Acesso pausado</Badge>}
                    {d !== null && d >= 7 && <Badge kind="warn">Parado há {d} dias</Badge>}
                    <MasteryBadge value={p.level} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
