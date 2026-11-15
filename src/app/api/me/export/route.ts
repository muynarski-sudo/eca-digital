import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Exportação dos dados do próprio titular (LGPD), em JSON. */
export async function GET() {
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const uid = auth.user.id;
  const own = (table: string, col = 'student_id') =>
    db
      .from(table)
      .select('*')
      .eq(col, uid)
      .then((r) => r.data ?? []);
  const [
    profile,
    consents,
    attempts,
    srs,
    mastery,
    progress,
    skills,
    assignments,
    subscriptions,
    recordings,
  ] = await Promise.all([
    db
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
      .then((r) => r.data),
    own('consents', 'user_id'),
    own('attempts'),
    own('srs_cards'),
    own('item_mastery'),
    own('unit_progress'),
    own('skill_scores'),
    own('assignments'),
    own('subscriptions'),
    db
      .from('voice_recordings')
      .select('id,question_id,created_at,expires_at')
      .eq('student_id', uid)
      .then((r) => r.data ?? []),
  ]);
  const body = JSON.stringify(
    {
      exportadoEm: new Date().toISOString(),
      perfil: profile,
      aceites: consents,
      tentativas: attempts,
      revisoes: srs,
      dominioPorItem: mastery,
      dominioPorUnidade: progress,
      habilidades: skills,
      tarefas: assignments,
      assinaturas: subscriptions,
      gravacoesDeVoz: recordings,
    },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meus-dados-falando-frances.json"',
    },
  });
}
