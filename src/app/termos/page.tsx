import { serverClient } from '@/lib/supabase/server';
import { currentLegal } from '@/lib/legal/data';
import { Markdown } from '@/components/Markdown';
import { TricolorBar } from '@/components/ui/TricolorBar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Termo de Uso' };

export default async function Page() {
  const db = await serverClient().catch(() => null);
  const doc = await currentLegal(db, 'terms');
  return (
    <>
      <TricolorBar />
      <main id="conteudo" className="mx-auto max-w-2xl px-4 py-8">
        <Markdown source={doc.body} />
        <p className="mt-8 text-sm text-ink-muted">
          Versão {doc.version || 'modelo (ainda não publicada)'}
        </p>
      </main>
    </>
  );
}
