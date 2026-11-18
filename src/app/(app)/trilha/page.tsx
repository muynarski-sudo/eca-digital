import Link from 'next/link';
import { Badge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { loadStageData } from '@/lib/data/stages';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Trilha' };
export const dynamic = 'force-dynamic';

export default async function Trilha() {
  const me = await requireStudent();
  const { views } = await loadStageData(await serverClient(), me.id, me.role);
  const done = views.filter((v) => v.state === 'done').length;
  return (
    <>
      <PageHeader
        title={`Trilha ${me.level}`}
        subtitle={`Cada nível trata de um assunto só. Termine todas as questões, veja a sua pontuação e o próximo nível abre. ${done} de ${views.length} níveis concluídos.`}
      />
      <ol className="grid gap-4 md:grid-cols-2">
        {views.map((v) => (
          <li key={v.stage.id}>
            <Card className={`h-full space-y-2 ${v.state === 'locked' ? 'bg-surface' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink-muted">Nível {v.number}</p>
                {v.state === 'locked' && <Badge kind="neutral">🔒 Bloqueado</Badge>}
                {v.state === 'open' && v.stat.answered === 0 && <Badge kind="info">Novo</Badge>}
                {v.state === 'open' && v.stat.answered > 0 && (
                  <Badge kind="info">Em andamento</Badge>
                )}
                {v.state === 'done' && <Badge kind="success">✓ Concluído · {v.stat.score}%</Badge>}
              </div>
              <h2 className="text-lg">{v.stage.title}</h2>
              <p className="text-ink-soft">{v.stage.hint}</p>
              {v.state === 'locked' ? (
                <p className="text-sm text-ink-muted">
                  Abre quando você concluir o nível anterior.
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    {v.stat.answered} de {v.stat.total} questões
                  </p>
                  <Link href={`/nivel/${v.stage.id}`} className="inline-block font-bold">
                    {v.state === 'done'
                      ? 'Ver pontuação →'
                      : v.stat.answered
                        ? 'Continuar →'
                        : 'Começar →'}
                  </Link>
                </>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
