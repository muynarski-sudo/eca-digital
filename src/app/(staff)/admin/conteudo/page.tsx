import Link from 'next/link';
import { QuestionForm, VocabForm } from '@/components/ContentForms';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/MasteryBadge';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Conteúdo' };
export const dynamic = 'force-dynamic';

export default async function Conteudo({ searchParams }: { searchParams: Promise<{ unidade?: string; tipo?: string; revisao?: string }> }) {
  await requireStaff(true);
  const sp = await searchParams;
  const db = await serverClient();
  const { data: units } = await db.from('units').select('id,title,ord').order('ord');
  const unit = sp.unidade ?? units?.[0]?.id ?? 'u01';
  const kind = sp.tipo === 'vocab' ? 'vocab' : 'questoes';
  let q = db.from('questions').select('id,type,prompt,answers,explanation,hint,needs_review,source').eq('unit_id', unit).order('id').limit(80);
  if (sp.revisao) q = q.eq('needs_review', true);
  const [{ data: questions }, { data: vocab }] = await Promise.all([
    kind === 'questoes' ? q : Promise.resolve({ data: [] as never[] }),
    kind === 'vocab' ? db.from('vocab_items').select('id,fr,pt,pron,needs_review').eq('unit_id', unit).order('id').limit(120) : Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <>
      <PageHeader title="Editar conteúdo" subtitle="Alterações valem na hora. Itens marcados como pendentes ficam escondidos dos alunos." />
      <Card as="nav" aria-label="Filtros" className="flex flex-wrap gap-3">
        {(units ?? []).map((u) => <Link key={u.id as string} href={`/admin/conteudo?unidade=${u.id}&tipo=${kind}`} aria-current={u.id === unit ? 'page' : undefined} className={u.id === unit ? 'font-bold underline' : ''}>{u.ord as number}</Link>)}
        <span className="text-ink-muted">|</span>
        <Link href={`/admin/conteudo?unidade=${unit}&tipo=questoes`}>Questões</Link>
        <Link href={`/admin/conteudo?unidade=${unit}&tipo=vocab`}>Vocabulário</Link>
        <Link href={`/admin/conteudo?unidade=${unit}&tipo=questoes&revisao=1`}>Só pendentes</Link>
      </Card>
      <ul className="space-y-3">
        {(questions ?? []).map((x: Record<string, unknown>) => (
          <li key={x.id as string}>
            <Card as="details">
              <summary className="cursor-pointer font-bold">{x.id as string} · {x.type as string} · {(x.prompt as string).slice(0, 80)} {x.needs_review ? <Badge kind="warn">pendente</Badge> : null} {x.source === 'generated' ? <Badge kind="info">generated</Badge> : null}</summary>
              <div className="mt-3"><QuestionForm q={{ id: x.id as string, prompt: x.prompt as string, answers: (x.answers as string[]) ?? [], explanation: x.explanation as string, hint: (x.hint as string | null) ?? null, needs_review: x.needs_review as boolean }} /></div>
            </Card>
          </li>
        ))}
        {(vocab ?? []).map((x: Record<string, unknown>) => (
          <li key={x.id as string}>
            <Card as="details">
              <summary className="cursor-pointer font-bold">{x.id as string} · {x.fr as string} · {x.pt as string} {x.needs_review ? <Badge kind="warn">pendente</Badge> : null}</summary>
              <div className="mt-3"><VocabForm v={{ id: x.id as string, fr: x.fr as string, pt: x.pt as string, pron: (x.pron as string | null) ?? null, needs_review: x.needs_review as boolean }} /></div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
