'use client';
import { ActionForm, Field } from '@/components/FormParts';
import { changePassword } from '@/lib/actions/auth';

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePassword} submitLabel="Trocar senha">
      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 8 caracteres."
      />
      <Field
        label="Repita a nova senha"
        name="confirm"
        type="password"
        autoComplete="new-password"
      />
    </ActionForm>
  );
}
