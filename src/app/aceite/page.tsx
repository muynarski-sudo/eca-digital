import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, CheckField } from '@/components/FormParts';
import { acceptTerms } from '@/lib/actions/auth';
import { hasAcceptedTerms } from '@/lib/legal/consent';
import { requireMe } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Antes de começar' };
export const dynamic = 'force-dynamic';

export default async function Aceite() {
  const me = await requireMe();
  if (await hasAcceptedTerms(await serverClient(), me.id)) redirect('/');
  return (
    <AuthFrame
      title="Antes de começar"
      subtitle="Sua professora criou o seu acesso. Falta só confirmar três coisas."
    >
      <ActionForm action={acceptTerms} submitLabel="Aceitar e continuar">
        <fieldset className="space-y-3 rounded-xl bg-brand-tint p-3">
          <legend className="sr-only">Aceites</legend>
          <CheckField name="privacy">
            Li e aceito a{' '}
            <Link href="/politica-de-privacidade" target="_blank">
              Política de Privacidade
            </Link>
            .
          </CheckField>
          <CheckField name="terms">
            Li e aceito o{' '}
            <Link href="/termos" target="_blank">
              Termo de Uso
            </Link>
            .
          </CheckField>
          <CheckField name="age">
            Tenho 18 anos ou mais, ou tenho autorização do meu responsável para usar a plataforma.
          </CheckField>
        </fieldset>
      </ActionForm>
    </AuthFrame>
  );
}
