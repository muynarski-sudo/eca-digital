import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
import { getQuestions } from '@/lib/data/content';
import { compareSpoken } from '@/lib/speech/compare';
import { sttFromEnv } from '@/lib/speech/providers';
import { persistResult } from '@/lib/practice/persist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 2_000_000;

/** Recebe a gravação, transcreve, compara com a frase-modelo e grava a tentativa. O áudio só é guardado se o aluno pedir (30 dias). */
export async function POST(req: Request) {
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const uid = auth.user.id;

  const form = await req.formData();
  const audio = form.get('audio');
  const questionId = String(form.get('questionId') ?? '');
  const keep = form.get('keep') === '1';
  const elapsedMs = Number(form.get('elapsedMs') ?? 0) || 0;
  const assignmentId = (form.get('assignmentId') as string | null) || null;
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: 'sem áudio' }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'gravação longa demais' }, { status: 413 });

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await db.from('attempts').select('id', { count: 'exact', head: true }).eq('student_id', uid).gte('created_at', since);
  if ((count ?? 0) >= 30) return NextResponse.json({ error: 'muitas tentativas seguidas, respire um instante' }, { status: 429 });

  const [q] = await getQuestions(db, { ids: [questionId] });
  if (!q || q.type !== 'speak' || !q.audio_text) return NextResponse.json({ error: 'exercício inválido' }, { status: 400 });

  const bytes = new Uint8Array(await audio.arrayBuffer());
  let transcript = '';
  try {
    transcript = await sttFromEnv().transcribe(bytes, audio.type || 'audio/webm', { language: 'fr', expectedHint: q.audio_text });
  } catch (e) {
    console.error('[speech] STT indisponível', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'não consegui processar o áudio agora, tente de novo' }, { status: 502 });
  }
  const cmp = compareSpoken(q.audio_text, transcript);
  await persistResult(db, {
    studentId: uid, itemId: q.id, itemKind: 'question', unit: q.unit, skill: 'fala', tags: q.error_tags,
    grade: { verdict: cmp.verdict, score: cmp.score, expected: q.audio_text }, response: transcript, elapsedMs, assignmentId,
  });

  if (keep) {
    const path = `${uid}/${randomUUID()}.webm`;
    const up = await db.storage.from('recordings').upload(path, bytes, { contentType: audio.type || 'audio/webm' });
    if (!up.error) await db.from('voice_recordings').insert({ student_id: uid, question_id: q.id, storage_path: path });
  }
  return NextResponse.json({ transcript, words: cmp.words, extra: cmp.extra, ratio: cmp.ratio, verdict: cmp.verdict, expected: q.audio_text, explanation: q.explanation });
}
