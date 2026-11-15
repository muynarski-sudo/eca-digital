'use client';
import { ActionForm } from '@/components/FormParts';
import { resetStudentPassword, unregisterStudent } from '@/lib/actions/staff';

export function ResetPasswordForm({ studentId }: { studentId: string }) {
  return (
    <ActionForm
      action={resetStudentPassword}
      submitLabel="Definir nova senha"
      hidden={{ studentId }}
    >
      <div>
        <label htmlFor="newpwd" className="mb-1 block font-bold">
          Nova senha
        </label>
        <input
          id="newpwd"
          name="password"
          required
          minLength={8}
          className="field"
          autoComplete="off"
        />
      </div>
    </ActionForm>
  );
}

export function UnregisterForm({ studentId, name }: { studentId: string; name: string }) {
  return (
    <ActionForm action={unregisterStudent} submitLabel="Descadastrar aluno" hidden={{ studentId }}>
      <p className="text-ink-soft">
        Apaga a conta de {name}, o progresso, as tarefas e as gravações. Não dá para desfazer. Para
        só suspender o acesso, use &ldquo;Pausar acesso&rdquo;.
      </p>
      <div>
        <label htmlFor="confirm" className="mb-1 block font-bold">
          Digite EXCLUIR para confirmar
        </label>
        <input id="confirm" name="confirm" required className="field" autoComplete="off" />
      </div>
    </ActionForm>
  );
}
