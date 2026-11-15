import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field, PasswordField } from '@/components/FormParts';
import { login } from '@/lib/actions/auth';
import { isLocalMode } from '@/lib/local/mode';
import { LOCAL_TESTERS } from '@/lib/local/testers';

export const metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    excluida?: string;
    instalado?: string;
    conteudo?: string;
  }>;
}) {
  const { next, excluida, instalado, conteudo } = await searchParams;
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
      {instalado && (
        <p
          role="status"
          className="rounded-xl border-2 border-success bg-success-bg p-3 font-bold text-success-text"
        >
          <span aria-hidden="true">✓ </span>Instalação concluída. Entre com a conta de
          administradora.
          {conteudo === 'pendente' &&
            ' O conteúdo do e-book ainda não foi carregado: depois de entrar, abra Admin, Conteúdo e use o botão de carregar.'}
        </p>
      )}
      <ActionForm action={login} submitLabel="On y va!" hidden={{ next: next ?? '' }}>
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
        <PasswordField />
      </ActionForm>
      <p className="text-sm">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
      </p>
      <p className="text-sm text-ink-muted">
        Não tem acesso? Peça seu e-mail e sua senha para a sua professora. Não há cadastro por conta
        própria.
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
