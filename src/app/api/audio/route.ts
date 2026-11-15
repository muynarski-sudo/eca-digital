import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { audioPath } from '@/lib/audio/key';

export const dynamic = 'force-dynamic';

/** Redireciona para uma URL assinada do áudio de referência. 404 se o arquivo ainda não foi gerado (o cliente usa a voz do navegador como alternativa, exceto no ditado). */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('k') ?? '';
  if (!/^[0-9a-f]{20}$/.test(key))
    return NextResponse.json({ error: 'chave inválida' }, { status: 400 });
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  for (const ext of ['mp3', 'wav']) {
    const { data } = await db.storage.from('audio').createSignedUrl(audioPath(key, ext), 3600);
    if (data?.signedUrl) return NextResponse.redirect(new URL(data.signedUrl, req.url), 302);
  }
  return NextResponse.json({ error: 'áudio ainda não gerado' }, { status: 404 });
}
