import { RegisterStudentForm } from '@/components/RegisterStudentForm';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireStaff } from '@/lib/session';

export const metadata = { title: 'Cadastrar aluno' };

export default async function Cadastrar() {
  await requireStaff();
  return (
    <>
      <PageHeader
        title="Cadastrar aluno"
        subtitle="Você cria o e-mail e a senha, e passa os dados ao aluno. No primeiro acesso ele aceita a política de privacidade e o termo de uso."
      />
      <Card className="max-w-lg">
        <RegisterStudentForm />
      </Card>
    </>
  );
}
