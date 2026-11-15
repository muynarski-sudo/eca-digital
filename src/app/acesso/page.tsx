import { AuthFrame } from '@/components/AuthFrame';
import { LinkButton } from '@/components/ui/Button';
import { requireMe } from '@/lib/session';
import { redirect } from 'next/navigation';
import { logout } from '@/lib/actions/auth';

export const metadata = { title: 'Acesso' };

export default async function AccessPage() {
  const me = await requireMe();
  if (me.hasAccess || me.role !== 'student') redirect('/');
  return (
    <AuthFrame title="Seu acesso está pausado" subtitle={me.access === 'paused' ? 'A professora pausou o seu acesso por enquanto.' : 'Não encontramos uma assinatura ativa para este e-mail.'}>
      <p className="text-ink-soft">Se você comprou pela Hotmart, use o mesmo e-mail da compra. Se acabou de pagar, pode levar alguns minutos. Em caso de dúvida, fale com a sua professora.</p>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/acesso" variant="secondary">Verificar de novo</LinkButton>
        <form action={logout}><button className="min-h-12 px-4 font-bold text-brand-blue underline">Sair</button></form>
      </div>
    </AuthFrame>
  );
}
