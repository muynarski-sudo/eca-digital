import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { tagLabel } from '@/lib/data/weak';
import { weeklySummary, type AttemptRow } from '@/lib/domain/metrics';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Resumo semanal' };
export const dynamic = 'force-dynamic';

export default async function Resumo() {
  await requireStaff();
  const db = await serverClient();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [{ data: students }, { data: att }] = await Promise.all([
    db.from('profiles').select('id,full_name,email').eq('role', 'student').order('full_name'),
    db
      .from('attempts')
      .select('student_id,verdict,score,created_at,error_tags')
      .gte('created_at', since)
      .limit(5000),
  ]);
  const rows: AttemptRow[] = (att ?? []).map((a) => ({
    studentId: a.student_id as string,
    at: new Date(a.created_at as string),
    verdict: a.verdict as AttemptRow['verdict'],
    score: Number(a.score),
    tags: a.error_tags as string[],
  }));
  return (
    <>
      <PageHeader title="Resumo semanal" subtitle="Últimos 7 dias, antes da próxima aula." />
      <ul className="grid gap-3 md:grid-cols-2">
        {(students ?? []).map((s) => {
          const w = weeklySummary(
            rows.filter((r) => r.studentId === s.id),
            now,
          );
          return (
            <li key={s.id as string}>
              <Card className="space-y-1">
                <h2 className="text-lg">{(s.full_name as string) ?? (s.email as string)}</h2>
                {w.attempts === 0 ? (
                  <p className="text-ink-soft">
                    <span aria-hidden="true">● </span>Não praticou nesta semana.
                  </p>
                ) : (
                  <>
                    <p>
                      {w.attempts} respostas em {w.daysStudied} dia(s),{' '}
                      {Math.round((w.accuracy ?? 0) * 100)}% de acerto.
                    </p>
                    {w.topErrorTags.length > 0 && (
                      <p className="text-ink-soft">
                        Para reforçar na aula:{' '}
                        {w.topErrorTags.map((t) => `${tagLabel(t.tag)} (${t.errors})`).join(', ')}.
                      </p>
                    )}
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
