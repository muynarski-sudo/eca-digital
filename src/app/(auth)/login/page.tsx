import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field } from '@/components/FormParts';
import { login } from '@/lib/actions/auth';

export const metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthFrame title="Bienvenu(e)!" subtitle="Entre para continuar seus estudos.">
      <ActionForm action={login} submitLabel="On y va!" hidden={{ next: next ?? '' }}>
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" />
      </ActionForm>
      <p className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
        <Link href="/cadastro">Criar conta</Link>
      </p>
    </AuthFrame>
  );
}
