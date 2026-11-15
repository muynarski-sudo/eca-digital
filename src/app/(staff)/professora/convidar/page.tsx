import { ActionForm, Field } from '@/components/FormParts';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { inviteStudent } from '@/lib/actions/staff';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Convidar aluno' };

export default async function Convidar() {
  await requireStaff();
  return (
    <>
      <PageHeader
        title="Convidar aluno"
        subtitle="O aluno recebe um e-mail para criar a senha e já entra vinculado a você."
      />
      <Card className="max-w-md">
        <ActionForm action={inviteStudent} submitLabel="Enviar convite">
          <Field label="E-mail do aluno" name="email" type="email" autoComplete="off" />
          <p className="text-sm text-ink-muted">
            O acesso depende de assinatura ativa. Depois do convite, conceda acesso manual na página
            do aluno ou aguarde a compra pela Hotmart.
          </p>
        </ActionForm>
      </Card>
    </>
  );
}
