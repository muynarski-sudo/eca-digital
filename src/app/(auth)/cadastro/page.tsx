import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, CheckField, Field } from '@/components/FormParts';
import { signup } from '@/lib/actions/auth';

export const metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return (
    <AuthFrame
      title="Criar conta"
      subtitle="Use o mesmo e-mail da sua compra ou do convite da professora."
    >
      <ActionForm action={signup} submitLabel="Criar minha conta">
        <Field label="Nome" name="name" autoComplete="name" />
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
        />
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
      <p className="text-sm">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </AuthFrame>
  );
}
