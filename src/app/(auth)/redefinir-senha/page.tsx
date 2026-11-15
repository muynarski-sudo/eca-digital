import { AuthFrame } from '@/components/AuthFrame';
import { ActionForm, Field } from '@/components/FormParts';
import { setNewPassword } from '@/lib/actions/auth';

export const metadata = { title: 'Nova senha' };

export default function ResetPage() {
  return (
    <AuthFrame title="Nova senha" subtitle="Escolha uma senha que você não use em outro lugar.">
      <ActionForm action={setNewPassword} submitLabel="Salvar nova senha">
        <Field label="Nova senha" name="password" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres." />
        <Field label="Repita a senha" name="confirm" type="password" autoComplete="new-password" />
      </ActionForm>
    </AuthFrame>
  );
}
