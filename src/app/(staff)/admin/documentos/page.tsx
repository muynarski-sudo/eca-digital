import { LegalForm } from '@/components/ContentForms';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { currentLegal } from '@/lib/legal/data';
import { requireStaff } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Documentos legais' };
export const dynamic = 'force-dynamic';

export default async function Documentos() {
  await requireStaff(true);
  const db = await serverClient();
  const [privacy, terms] = await Promise.all([currentLegal(db, 'privacy'), currentLegal(db, 'terms')]);
  return (
    <>
      <PageHeader title="Documentos legais" subtitle="Cada publicação cria uma nova versão. O aceite de cada pessoa guarda a versão aceita." />
      <Card tone="tint">O texto atual é um modelo e precisa de revisão do advogado responsável antes de publicar. A regra para menores de 18 anos e a lista de provedores com transferência internacional também devem ser validadas.</Card>
      <Card className="space-y-3"><h2 className="text-xl">Política de Privacidade (versão {privacy.version || 'modelo'})</h2><LegalForm kind="privacy" title={privacy.title} body={privacy.body} /></Card>
      <Card className="space-y-3"><h2 className="text-xl">Termo de Uso (versão {terms.version || 'modelo'})</h2><LegalForm kind="terms" title={terms.title} body={terms.body} /></Card>
    </>
  );
}
