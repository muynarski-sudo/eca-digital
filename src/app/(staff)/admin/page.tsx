import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { activeThisWeek, hardestUnits, retention30, type AttemptRow } from '@/lib/domain/metrics';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Métricas' };
export const dynamic = 'force-dynamic';

export default async function Metricas() {
  await requireStaff(true);
  const db = await serverClient();
  const now = new Date();
  const since = new Date(now.getTime() - 400 * 86_400_000).toISOString();
  const [{ data: att }, { data: qs }, { data: units }, { count: students }, { count: active }] = await Promise.all([
    db.from('attempts').select('student_id,question_id,verdict,score,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(20000),
    db.from('questions').select('id,unit_id'),
    db.from('units').select('id,title,ord'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);
  const unitOf = new Map((qs ?? []).map((q) => [q.id as string, q.unit_id as string | null]));
  const title = new Map((units ?? []).map((u) => [u.id as string, `${u.ord}. ${u.title}`]));
  const rows: AttemptRow[] = (att ?? []).map((a) => ({ studentId: a.student_id as string, at: new Date(a.created_at as string), verdict: a.verdict as AttemptRow['verdict'], score: Number(a.score), unit: unitOf.get(a.question_id as string) ?? null }));
  const ret = retention30(rows, now);
  const hard = hardestUnits(rows);

  return (
    <>
      <PageHeader title="Métricas" subtitle="Visão geral da plataforma." />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-ink-muted">Alunos cadastrados</p><p className="text-3xl font-bold text-brand-blue-dark">{students ?? 0}</p></Card>
        <Card><p className="text-sm text-ink-muted">Assinaturas ativas</p><p className="text-3xl font-bold text-brand-blue-dark">{active ?? 0}</p></Card>
        <Card><p className="text-sm text-ink-muted">Ativos na semana</p><p className="text-3xl font-bold text-brand-blue-dark">{activeThisWeek(rows, now)}</p></Card>
        <Card>
          <p className="text-sm text-ink-muted">Retenção em 30 dias</p>
          <p className="text-3xl font-bold text-brand-blue-dark">{ret.rate === null ? 'sem dados' : `${Math.round(ret.rate * 100)}%`}</p>
          <p className="text-xs text-ink-muted">{ret.retained} de {ret.cohort} que começaram há 30 dias ou mais voltaram depois de 30 dias.</p>
        </Card>
      </div>
      <Card as="section" aria-labelledby="dificeis" className="space-y-2">
        <h2 id="dificeis" className="text-xl">Unidades mais difíceis</h2>
        {hard.length === 0 ? <p className="text-ink-soft">Ainda não há tentativas suficientes (mínimo de 10 por unidade).</p> : (
          <ol className="space-y-1">{hard.map((h) => <li key={h.unit} className="flex justify-between"><span>{title.get(h.unit) ?? h.unit}</span><span>{Math.round(h.accuracy * 100)}% de acerto · {h.attempts} respostas</span></li>)}</ol>
        )}
      </Card>
    </>
  );
}
