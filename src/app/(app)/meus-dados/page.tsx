import Link from 'next/link';
import { DeleteAccountForm } from '@/components/DeleteAccountForm';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { deleteAllRecordings, deleteRecording } from '@/lib/actions/privacy';
import { requireMe } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Privacidade e meus dados' };
export const dynamic = 'force-dynamic';

const KIND = {
  privacy: 'Política de Privacidade',
  terms: 'Termo de Uso',
  age_notice: 'Aviso de maioridade',
} as const;

export default async function MeusDados() {
  const me = await requireMe();
  const db = await serverClient();
  const [{ data: consents }, { data: recs }, { data: subs }] = await Promise.all([
    db
      .from('consents')
      .select('kind,version,accepted_at')
      .eq('user_id', me.id)
      .order('accepted_at', { ascending: false }),
    db
      .from('voice_recordings')
      .select('id,question_id,created_at,expires_at')
      .eq('student_id', me.id)
      .order('created_at', { ascending: false }),
    db
      .from('subscriptions')
      .select('status,origin,valid_until')
      .eq('student_id', me.id)
      .order('created_at', { ascending: false }),
  ]);
  return (
    <>
      <PageHeader
        title="Privacidade e meus dados"
        subtitle="Você manda nos seus dados. Guardamos só o necessário e não usamos rastreadores de terceiros."
      />
      <Card as="section" aria-labelledby="quais" className="space-y-2">
        <h2 id="quais" className="text-xl">
          O que guardamos sobre você
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Nome e e-mail: {me.fullName ?? '(sem nome)'}, {me.email}
          </li>
          <li>Suas respostas, progresso e revisões, que a sua professora vê.</li>
          <li>
            Situação da assinatura:{' '}
            {(subs ?? []).map((s) => `${s.status} (${s.origin})`).join(', ') || 'nenhuma'}.
          </li>
          <li>Gravações de voz só se você pediu para guardar (apagadas em 30 dias).</li>
        </ul>
        <p className="text-sm">
          <Link href="/politica-de-privacidade">Política de Privacidade</Link> ·{' '}
          <Link href="/termos">Termo de Uso</Link>
        </p>
      </Card>

      <Card as="section" aria-labelledby="exportar" className="space-y-3">
        <h2 id="exportar" className="text-xl">
          Exportar meus dados
        </h2>
        <p className="text-ink-soft">Baixe tudo o que temos sobre você em um arquivo JSON.</p>
        <LinkButton href="/api/me/export" variant="secondary">
          Baixar meus dados
        </LinkButton>
      </Card>

      <Card as="section" aria-labelledby="voz" className="space-y-3">
        <h2 id="voz" className="text-xl">
          Minhas gravações de voz
        </h2>
        {(recs ?? []).length === 0 ? (
          <p className="text-ink-soft">Você não tem gravações guardadas.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {(recs ?? []).map((r) => (
                <li
                  key={r.id as string}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2"
                >
                  <span>
                    Gravada em {new Date(r.created_at as string).toLocaleDateString('pt-BR')} ·
                    apaga sozinha em {new Date(r.expires_at as string).toLocaleDateString('pt-BR')}
                  </span>
                  <form action={deleteRecording.bind(null, r.id as string)}>
                    <Button variant="danger" type="submit">
                      Apagar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={deleteAllRecordings}>
              <Button variant="danger" type="submit">
                Apagar todas
              </Button>
            </form>
          </>
        )}
      </Card>

      <Card as="section" aria-labelledby="aceites" className="space-y-2">
        <h2 id="aceites" className="text-xl">
          Meus aceites
        </h2>
        <ul className="space-y-1">
          {(consents ?? []).map((c, i) => (
            <li key={i}>
              {KIND[c.kind as keyof typeof KIND]} · versão {c.version} ·{' '}
              {new Date(c.accepted_at as string).toLocaleDateString('pt-BR')}
            </li>
          ))}
          {(consents ?? []).length === 0 && (
            <li className="text-ink-soft">Nenhum aceite registrado.</li>
          )}
        </ul>
      </Card>

      <Card as="section" aria-labelledby="excluir" className="space-y-3 border-brand-red-text">
        <h2 id="excluir" className="text-xl text-brand-red-text">
          Excluir minha conta
        </h2>
        <DeleteAccountForm />
      </Card>
    </>
  );
}
