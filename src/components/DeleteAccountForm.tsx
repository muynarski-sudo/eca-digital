'use client';
import { ActionForm, Field } from '@/components/FormParts';
import { deleteAccount } from '@/lib/actions/privacy';

export function DeleteAccountForm() {
  return (
    <ActionForm action={deleteAccount} submitLabel="Excluir minha conta e meus dados">
      <p className="text-ink-soft">
        Isso apaga sua conta, seu progresso, suas tarefas e suas gravações. Não dá para desfazer.
      </p>
      <Field label="Digite EXCLUIR para confirmar" name="confirm" />
    </ActionForm>
  );
}
