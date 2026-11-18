import Link from 'next/link';
import { Badge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StreakChip } from '@/components/ui/StreakChip';
import { loadStageData } from '@/lib/data/stages';
import { loadProgress } from '@/lib/data/progress';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Início' };
export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const me = await requireStudent();
  const db = await serverClient();
  const now = new Date();
  const [progress, stages, assignments] = await Promise.all([
    loadProgress(db, me.id, me.level, now),
    loadStageData(db, me.id, me.role),
    db
      .from('assignments')
      .select('id,title,due_at,status,teacher_feedback,teacher_grade')
      .eq('student_id', me.id)
      .order('due_at')
      .limit(10),
  ]);
  const stageViews = stages.views;
  const current = stageViews.find((v) => v.state === 'open');
  const stageDone = stageViews.filter((v) => v.state === 'done').length;
  const todo = (assignments.data ?? []).filter(
    (a) => a.status === 'assigned' || a.status === 'in_progress',
  );
  const reviewed = (assignments.data ?? [])
    .filter((a) => a.status === 'reviewed' && a.teacher_feedback)
    .slice(-1)[0];
  const first = (me.fullName ?? '').split(' ')[0];

  return (
    <>
      <PageHeader
        title={`Bienvenu(e)${first ? `, ${first}` : ''}!`}
        subtitle="Um pouquinho por dia leva longe."
      />
      <nav aria-label="Áreas de estudo" className="grid gap-4 sm:grid-cols-3">
        {[
          ['/leitura', '📖', 'Leitura', 'Textos por nível (A1 a C2), com áudio e perguntas.'],
          ['/gramatica', '✏️', 'Gramática', 'Complete as frases com o verbo no tempo certo.'],
          ['/vocabulario', '🔤', 'Vocabulário', 'Ouça a palavra e escolha o significado.'],
        ].map(([href, icon, title, text]) => (
          <Link key={href} href={href!} className="block no-underline">
            <Card className="h-full space-y-1 hover:border-brand-blue hover:shadow-md">
              <p className="text-xl font-bold text-brand-blue-dark">
                <span aria-hidden="true">{icon} </span>
                {title}
              </p>
              <p className="text-ink-soft">{text}</p>
            </Card>
          </Link>
        ))}
      </nav>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col items-center gap-3 text-center">
          <ProgressRing value={progress.level} label="Progresso do nível A1" />
          <p className="font-bold text-brand-blue-dark">Seu progresso no A1</p>
          <StreakChip days={progress.streak} />
        </Card>
        <div className="space-y-4 md:col-span-2">
          <Card tone="tint" aria-labelledby="treino" as="section" className="space-y-3">
            <h2 id="treino" className="text-xl">
              {current ? `Nível ${current.number}: ${current.stage.title}` : 'Trilha concluída!'}
            </h2>
            <p className="text-ink-soft">
              {current
                ? `${current.stat.answered} de ${current.stat.total} questões. Um assunto de cada vez, em ordem.`
                : 'Você concluiu todos os níveis do A1. Veja a pontuação de cada um na trilha.'}
            </p>
            <LinkButton href={current ? `/nivel/${current.stage.id}` : '/trilha'}>
              {current?.stat.answered ? 'Continuar' : current ? 'On y va!' : 'Ver a trilha'}
            </LinkButton>
            <p className="text-sm text-ink-muted">
              {stageDone} de {stageViews.length} níveis concluídos.
            </p>
          </Card>
          <Card as="section" aria-labelledby="tarefa" className="space-y-3">
            <h2 id="tarefa" className="text-xl">
              Tarefa da professora
            </h2>
            {todo.length === 0 && (
              <p className="text-ink-soft">Nada pendente por aqui. Que tal um treino?</p>
            )}
            {todo.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
              >
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="text-sm text-ink-soft">
                    Prazo: {new Date(a.due_at).toLocaleDateString('pt-BR')}
                  </p>
                  {new Date(a.due_at) < now && <Badge kind="warn">Atrasada</Badge>}
                </div>
                <LinkButton href={`/praticar?tarefa=${a.id}`} variant="secondary">
                  Fazer tarefa
                </LinkButton>
              </div>
            ))}
            {reviewed && (
              <div className="rounded-xl bg-brand-tint p-3">
                <p className="font-bold text-brand-blue-dark">
                  Recado da professora
                  {reviewed.teacher_grade != null
                    ? ` · nota ${Number(reviewed.teacher_grade).toLocaleString('pt-BR')}`
                    : ''}
                </p>
                <p>{reviewed.teacher_feedback}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">Quer escolher o que estudar?</p>
        <span className="flex gap-3">
          <Link href="/trilha">Ver a trilha</Link>
          <Link href="/flashcards">Flashcards</Link>
          <Link href="/conjugacao">Conjugação</Link>
        </span>
      </Card>
    </>
  );
}
