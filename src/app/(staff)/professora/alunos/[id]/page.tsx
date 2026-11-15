import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field } from '@/components/FormParts';
import { Badge, MasteryBadge } from '@/components/ui/MasteryBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { createAssignment, grantManualAccess, revokeManualAccess, setAccess, unlockUnit } from '@/lib/actions/staff';
import { loadProgress } from '@/lib/data/progress';
import { tagLabel, weakTags } from '@/lib/data/weak';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const VERDICT = { correct: '✓ Certa', almost: '≈ Quase', wrong: '✗ Errada' } as const;

export default async function AlunoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const db = await serverClient();
  const { data: s } = await db.from('profiles').select('id,full_name,email,access,level').eq('id', id).eq('role', 'student').maybeSingle();
  if (!s) notFound();
  const [progress, weak, hist, subs, unlocks] = await Promise.all([
    loadProgress(db, id, s.level as string),
    weakTags(db, id),
    db.from('attempts').select('question_id,verdict,response,created_at').eq('student_id', id).order('created_at', { ascending: false }).limit(25),
    db.from('subscriptions').select('status,origin,valid_until').eq('student_id', id),
    db.from('unit_unlocks').select('unit_id').eq('student_id', id),
  ]);
  const unlocked = new Set((unlocks.data ?? []).map((u) => u.unit_id as string));
  const weakItems = Object.entries(progress.itemMastery).filter(([k]) => !k.startsWith('conj:')).sort((a, b) => a[1].mastery - b[1].mastery).slice(0, 8);
  const ids = [...new Set([...(hist.data ?? []).map((h) => h.question_id as string), ...weakItems.map(([k]) => k)])].filter((k) => !k.startsWith('conj:'));
  const { data: qs } = ids.length ? await db.from('questions').select('id,prompt').in('id', ids) : { data: [] as Array<{ id: string; prompt: string }> };
  const prompt = new Map((qs ?? []).map((q) => [q.id, q.prompt]));
  const today = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title={(s.full_name as string) ?? (s.email as string)} subtitle={s.email as string}>
        <div className="flex flex-wrap items-center gap-3">
          <MasteryBadge value={progress.level} />
          <span>Sequência: {progress.streak} dia(s)</span>
          {s.access === 'paused' ? <Badge kind="warn">Acesso pausado</Badge> : <Badge kind="success">Acesso liberado</Badge>}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" aria-labelledby="acesso" className="space-y-3">
          <h2 id="acesso" className="text-xl">Acesso</h2>
          <ul className="text-sm">{(subs.data ?? []).map((x, i) => <li key={i}>{x.origin as string}: {x.status as string}{x.valid_until ? ` até ${new Date(x.valid_until as string).toLocaleDateString('pt-BR')}` : ''}</li>)}{(subs.data ?? []).length === 0 && <li>Sem assinatura.</li>}</ul>
          <form action={setAccess.bind(null, id, s.access === 'paused' ? 'active' : 'paused')}>
            <Button variant={s.access === 'paused' ? 'primary' : 'danger'} type="submit">{s.access === 'paused' ? 'Liberar acesso' : 'Pausar acesso'}</Button>
          </form>
          <ActionForm action={grantManualAccess} submitLabel="Conceder acesso manual" hidden={{ studentId: id }}>
            <Field label="Dias de acesso" name="days" type="number" hint="Ex.: 30" />
          </ActionForm>
          <form action={revokeManualAccess.bind(null, id)}><Button variant="ghost" type="submit">Encerrar acesso manual</Button></form>
        </Card>

        <Card as="section" aria-labelledby="atribuir" className="space-y-3">
          <h2 id="atribuir" className="text-xl">Atribuir tarefa de casa</h2>
          <ActionForm action={createAssignment} submitLabel="Atribuir" hidden={{ studentId: id }}>
            <Field label="Título" name="title" />
            <div>
              <label htmlFor="unitId" className="mb-1 block font-bold">Unidade</label>
              <select id="unitId" name="unitId" className="field" required>
                {progress.units.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.order}. {u.unit.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="due" className="mb-1 block font-bold">Prazo</label>
              <input id="due" name="due" type="date" required defaultValue={today} className="field" />
            </div>
          </ActionForm>
        </Card>
      </div>

      <Card as="section" aria-labelledby="dominio" className="space-y-3">
        <h2 id="dominio" className="text-xl">Domínio por unidade</h2>
        <ul className="space-y-3">
          {progress.units.map((u) => (
            <li key={u.unit.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
              <div><p className="font-bold">{u.unit.order}. {u.unit.title}</p><p className="text-sm text-ink-soft">{u.practiced} de {u.questionCount} exercícios praticados · {u.state === 'locked' ? 'bloqueada' : u.state === 'mastered' ? 'dominada' : 'em andamento'}</p></div>
              <div className="flex items-center gap-2">
                <MasteryBadge value={u.mastery} />
                {u.state === 'locked' && <form action={unlockUnit.bind(null, id, u.unit.id, true)}><Button variant="secondary" type="submit">Liberar</Button></form>}
                {unlocked.has(u.unit.id) && <form action={unlockUnit.bind(null, id, u.unit.id, false)}><Button variant="ghost" type="submit">Desfazer liberação</Button></form>}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card as="section" aria-labelledby="erros" className="space-y-2">
          <h2 id="erros" className="text-xl">Erros mais frequentes</h2>
          {weak.length === 0 ? <p className="text-ink-soft">Sem erros registrados.</p> : <ul className="space-y-1">{weak.map((w) => <li key={w.tag} className="flex justify-between"><span>{tagLabel(w.tag)}</span><span><span aria-hidden="true">✗ </span>{w.errors} de {w.attempts}</span></li>)}</ul>}
        </Card>
        <Card as="section" aria-labelledby="fracos" className="space-y-2">
          <h2 id="fracos" className="text-xl">Itens mais fracos</h2>
          <ul className="space-y-1 text-sm">{weakItems.map(([k, v]) => <li key={k} className="flex justify-between gap-2"><span className="truncate">{prompt.get(k) ?? k}</span><span>{Math.round(v.mastery * 100)}%</span></li>)}{weakItems.length === 0 && <li className="text-ink-soft">Ainda sem prática.</li>}</ul>
        </Card>
      </div>

      <Card as="section" aria-labelledby="hist" className="space-y-2">
        <h2 id="hist" className="text-xl">Histórico recente</h2>
        <ul className="space-y-1 text-sm">
          {(hist.data ?? []).map((h, i) => (
            <li key={i} className="flex justify-between gap-3 border-b border-line pb-1">
              <span className="truncate">{prompt.get(h.question_id as string) ?? (h.question_id as string)}{h.response ? <span className="text-ink-muted"> → {String(h.response).slice(0, 60)}</span> : null}</span>
              <span className="shrink-0 font-bold">{VERDICT[h.verdict as keyof typeof VERDICT]} · {new Date(h.created_at as string).toLocaleDateString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </Card>
      <p><Link href="/professora">← Voltar para a lista</Link></p>
    </>
  );
}
