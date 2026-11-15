import Link from 'next/link';
import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field } from '@/components/FormParts';
import { requestReset } from '@/lib/actions/auth';

export const metadata = { title: 'Recuperar senha' };

export default function RecoverPage() {
  return (
    <AuthFrame title="Recuperar senha" subtitle="Enviamos um link para você criar uma nova senha.">
      <ActionForm action={requestReset} submitLabel="Enviar link">
        <Field label="E-mail" name="email" type="email" autoComplete="email" />
      </ActionForm>
      <p className="text-sm"><Link href="/login">Voltar ao login</Link></p>
    </AuthFrame>
  );
}
