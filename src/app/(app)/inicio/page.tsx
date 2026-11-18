import Link from 'next/link';
import { Badge } from '@/components/ui/MasteryBadge';
import { Card } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
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

  const pct =
    current && current.stat.total
      ? Math.round((current.stat.answered / current.stat.total) * 100)
      : 0;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl">{`Bienvenu(e)${first ? `, ${first}` : ''}!`}</h1>
          <p className="text-ink-soft">Um pouquinho por dia leva longe.</p>
        </div>
        <StreakChip days={progress.streak} />
      </header>

      <Card tone="tint" aria-labelledby="treino" as="section" className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">
          {current?.stat.answered ? 'Continue de onde parou' : 'Seu próximo passo'}
        </p>
        <h2 id="treino" className="text-xl md:text-2xl">
          {current ? `Nível ${current.number}: ${current.stage.title}` : 'Trilha concluída!'}
        </h2>
        {current && (
          <div
            className="h-3 overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progresso do nível atual"
          >
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="text-ink-soft">
          {current
            ? `${current.stat.answered} de ${current.stat.total} questões. Um assunto de cada vez, em ordem.`
            : 'Você concluiu todos os níveis do A1. Veja a pontuação de cada um na trilha.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href={current ? `/nivel/${current.stage.id}` : '/trilha'}>
            {current?.stat.answered ? 'Continuar' : current ? 'On y va!' : 'Ver a trilha'}
          </LinkButton>
          <Link href="/trilha" className="text-sm font-bold">
            {stageDone} de {stageViews.length} níveis concluídos · ver trilha
          </Link>
        </div>
      </Card>

      {(todo.length > 0 || reviewed) && (
        <Card as="section" aria-labelledby="tarefa" className="space-y-3">
          <h2 id="tarefa" className="text-xl">
            Tarefa da professora
          </h2>
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
      )}

      <nav aria-label="Áreas de estudo" className="space-y-2">
        <h2 className="text-lg">Estude do seu jeito</h2>
        <ul className="grid grid-cols-3 gap-3">
          {[
            ['/leitura', '📖', 'Leitura', 'Textos e áudio'],
            ['/gramatica', '✏️', 'Gramática', 'Verbos em frases'],
            ['/vocabulario', '🔤', 'Vocabulário', 'Ouça e traduza'],
            ['/flashcards', '🃏', 'Flashcards', 'Revise palavras'],
            ['/conjugacao', '🔁', 'Conjugação', 'Tabelas e treino'],
            ['/brincar', '🎈', 'Brincar', 'Alfabeto e jogos'],
          ].map(([href, icon, title, text]) => (
            <li key={href}>
              <Link
                href={href!}
                className="flex h-full min-h-28 flex-col items-center justify-center gap-1 rounded-card border border-line bg-white p-3 text-center no-underline shadow-sm hover:border-brand-blue hover:no-underline"
              >
                <span aria-hidden="true" className="text-3xl">
                  {icon}
                </span>
                <span className="font-bold text-brand-blue-dark">{title}</span>
                <span className="text-xs text-ink-soft">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Card className="flex items-center gap-4">
        <div className="shrink-0">
          <ProgressRing value={progress.level} size={96} label="Progresso do nível A1" />
        </div>
        <div>
          <p className="font-bold text-brand-blue-dark">Seu progresso no A1</p>
          <p className="text-sm text-ink-soft">
            Domínio médio das unidades do e-book. Veja os detalhes em Evolução.
          </p>
          <Link href="/evolucao" className="text-sm font-bold">
            Ver evolução →
          </Link>
        </div>
      </Card>
    </>
  );
}
