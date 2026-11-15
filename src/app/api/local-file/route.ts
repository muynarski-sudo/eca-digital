import { NextResponse } from 'next/server';
import { LocalClient } from '@/lib/local/client';
import { isLocalMode } from '@/lib/local/mode';
import { serverClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav' };

/** Serve os áudios de referência guardados em disco (só no modo local, só o bucket "audio", só para quem está logado). */
export async function GET(req: Request) {
  if (!isLocalMode()) return NextResponse.json({ error: 'indisponível' }, { status: 404 });
  const u = new URL(req.url);
  const bucket = u.searchParams.get('b');
  const p = u.searchParams.get('p') ?? '';
  if (bucket !== 'audio' || !/^[a-z0-9/_-]+\.(mp3|wav)$/i.test(p))
    return NextResponse.json({ error: 'pedido inválido' }, { status: 400 });
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const file = new LocalClient({ role: 'service', uid: null }).storage.from('audio').read(p);
  if (!file) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': MIME[p.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
