import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PlayClient } from '@/components/play/PlayClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { phrases } from '@/lib/content/static';
import { getVocab } from '@/lib/data/content';
import { requireStudent } from '@/lib/session';
import { serverClient } from '@/lib/supabase/server';

export const metadata = { title: 'Brincar' };
export const dynamic = 'force-dynamic';

/** Áudios pré-gravados (public/audio/play). Sem eles, a Iasmyn usa a voz do aparelho. */
function loadClips() {
  const file = path.join(process.cwd(), 'public', 'audio', 'play', 'manifest.json');
  if (!existsSync(file)) return undefined;
  const m = JSON.parse(readFileSync(file, 'utf8')) as { keys: string[]; credit?: string };
  return { base: '/audio/play/', keys: m.keys, credit: m.credit };
}

export default async function Brincar() {
  const me = await requireStudent();
  const db = await serverClient();
  const vocab = (await getVocab(db))
    .filter((v) => v.category !== 'alfabeto' && v.category !== 'numeros')
    .map((v) => ({ fr: v.fr, pt: v.pt }));
  return (
    <>
      <PageHeader
        title="Brincar com a Iasmyn"
        subtitle="Alfabeto, jogos e frases para treinar o ouvido e a pronúncia, sem pressa."
      />
      <PlayClient
        vocab={vocab}
        phrases={phrases.map((p) => ({ fr: p.fr, pt: p.pt, pron: p.pron }))}
        storageKey={`ffp-play:${me.id}`}
        clips={loadClips()}
      />
    </>
  );
}
