'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import type { FormState } from './auth';

export async function deleteRecording(id: string) {
  const rid = z.string().uuid().parse(id);
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const { data: rec } = await db.from('voice_recordings').select('storage_path').eq('id', rid).eq('student_id', auth.user.id).maybeSingle();
  if (rec) {
    await db.storage.from('recordings').remove([rec.storage_path as string]);
    await db.from('voice_recordings').delete().eq('id', rid).eq('student_id', auth.user.id);
  }
  revalidatePath('/meus-dados');
}

export async function deleteAllRecordings() {
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const { data: recs } = await db.from('voice_recordings').select('id,storage_path').eq('student_id', auth.user.id);
  if (recs?.length) {
    await db.storage.from('recordings').remove(recs.map((r) => r.storage_path as string));
    await db.from('voice_recordings').delete().eq('student_id', auth.user.id);
  }
  revalidatePath('/meus-dados');
}

/** Exclusão da conta pelo próprio titular. Apaga as gravações no Storage e o usuário (o banco apaga o resto em cascata). */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  if (String(form.get('confirm') ?? '').trim().toUpperCase() !== 'EXCLUIR') return { error: 'Digite EXCLUIR para confirmar.' };
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { error: 'Sessão expirada. Entre de novo.' };
  const admin = adminClient();
  const { data: recs } = await admin.from('voice_recordings').select('storage_path').eq('student_id', auth.user.id);
  if (recs?.length) await admin.storage.from('recordings').remove(recs.map((r) => r.storage_path as string));
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return { error: 'Não foi possível excluir agora. Tente de novo ou fale com a professora.' };
  await db.auth.signOut();
  redirect('/login?excluida=1');
}
