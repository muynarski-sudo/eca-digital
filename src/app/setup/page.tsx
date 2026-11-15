import { notFound } from 'next/navigation';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field } from '@/components/FormParts';
import { runSetup } from '@/lib/actions/setup';
import { adminExists } from '@/lib/setup/admin';
import { adminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Instalação inicial' };
export const dynamic = 'force-dynamic';

/** Cria a conta da instrutora (administradora) na primeira vez. Some (404) assim que existir uma administradora. */
export default async function Setup() {
  if (!process.env.SETUP_TOKEN) notFound();
  let exists = true;
  try {
    exists = await adminExists(adminClient());
  } catch {
    exists = false; // banco ainda sem as migrations: a ação mostra o erro
  }
  if (exists) notFound();
  return (
    <AuthFrame
      title="Instalação inicial"
      subtitle="Crie a conta da instrutora (administradora). Esta página só funciona uma vez."
    >
      <ActionForm action={runSetup} submitLabel="Criar conta e carregar o conteúdo">
        <Field
          label="Código de instalação"
          name="token"
          type="password"
          autoComplete="off"
          hint="É o valor da variável SETUP_TOKEN que você definiu no servidor."
        />
        <Field label="Nome da instrutora" name="name" autoComplete="name" />
        <Field label="E-mail (será o login)" name="email" type="email" autoComplete="email" />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 10 caracteres."
        />
      </ActionForm>
    </AuthFrame>
  );
}
