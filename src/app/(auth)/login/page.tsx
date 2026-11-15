import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field } from '@/components/FormParts';
import { login } from '@/lib/actions/auth';
import { isLocalMode } from '@/lib/local/mode';
import { LOCAL_TESTERS } from '@/lib/local/testers';

export const metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; excluida?: string }>;
}) {
  const { next, excluida } = await searchParams;
  return (
    <AuthFrame title="Bienvenu(e)!" subtitle="Entre para continuar seus estudos.">
      {excluida && (
        <p
          role="status"
          className="rounded-xl border-2 border-success bg-success-bg p-3 font-bold text-success-text"
        >
          <span aria-hidden="true">✓ </span>Sua conta foi excluída.
        </p>
      )}
      <ActionForm action={login} submitLabel="On y va!" hidden={{ next: next ?? '' }}>
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <Field label="Senha" name="password" type="password" autoComplete="current-password" />
      </ActionForm>
      <p className="text-sm">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </p>
      {isLocalMode() && (
        <div className="rounded-xl bg-brand-tint p-3 text-sm" aria-label="Usuários de teste">
          <p className="font-bold text-brand-blue-dark">Modo local: usuários de teste</p>
          <ul className="mt-1 space-y-1">
            {LOCAL_TESTERS.map((u) => (
              <li key={u.email}>
                {u.role === 'student' ? 'Aluno' : 'Professora'}: <code>{u.email}</code> · senha{' '}
                <code>{u.password}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthFrame>
  );
}
