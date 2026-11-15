'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import type { FormState } from './auth';

async function staff() {
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error('Sessão expirada.');
  const { data: p } = await db.from('profiles').select('id,role').eq('id', data.user.id).single();
  if (!p || p.role === 'student') throw new Error('Acesso restrito à equipe.');
  return { db, uid: p.id as string, role: p.role as 'teacher' | 'admin' };
}

const uuid = z.string().uuid();

export async function inviteStudent(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.string().trim().toLowerCase().email('Confira o e-mail.').safeParse(form.get('email'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { db, uid } = await staff();
  const { error } = await db.from('invites').insert({ teacher_id: uid, email: parsed.data });
  if (error) return { error: 'Não foi possível registrar o convite.' };
  const admin = adminClient();
  const { data: existing } = await admin.from('profiles').select('id').ilike('email', parsed.data).maybeSingle();
  if (existing) {
    // já tem conta: vincula direto
    await admin.from('teacher_students').upsert({ teacher_id: uid, student_id: existing.id });
    await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('teacher_id', uid).ilike('email', parsed.data).is('accepted_at', null);
    revalidatePath('/professora');
    return { ok: 'Esse e-mail já tinha conta. O aluno foi vinculado a você.' };
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(parsed.data, { redirectTo: `${site}/auth/callback?next=/redefinir-senha` });
  if (mailErr) return { error: 'O convite foi registrado, mas o e-mail não saiu. Peça ao aluno para criar a conta com esse e-mail.' };
  revalidatePath('/professora');
  return { ok: 'Convite enviado. Quando o aluno entrar, ele já aparece na sua lista.' };
}

export async function setAccess(studentId: string, access: 'active' | 'paused') {
  const id = uuid.parse(studentId);
  const { db } = await staff();
  const { error } = await db.from('profiles').update({ access }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/professora/alunos/${id}`);
  revalidatePath('/professora');
}

export async function grantManualAccess(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ studentId: uuid, days: z.coerce.number().int().min(1).max(366) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe quantos dias de acesso (1 a 366).' };
  const { db } = await staff();
  const until = new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
  const { data: cur } = await db.from('subscriptions').select('id').eq('student_id', parsed.data.studentId).eq('origin', 'manual').maybeSingle();
  const { error } = cur
    ? await db.from('subscriptions').update({ status: 'active', valid_until: until, updated_at: new Date().toISOString() }).eq('id', cur.id)
    : await db.from('subscriptions').insert({ student_id: parsed.data.studentId, status: 'active', origin: 'manual', external_id: `manual-${parsed.data.studentId}`, valid_until: until });
  if (error) return { error: 'Não foi possível conceder o acesso.' };
  revalidatePath(`/professora/alunos/${parsed.data.studentId}`);
  return { ok: `Acesso manual até ${new Date(until).toLocaleDateString('pt-BR')}.` };
}

export async function revokeManualAccess(studentId: string) {
  const id = uuid.parse(studentId);
  const { db } = await staff();
  await db.from('subscriptions').update({ status: 'canceled', valid_until: new Date().toISOString() }).eq('student_id', id).eq('origin', 'manual');
  revalidatePath(`/professora/alunos/${id}`);
}

export async function unlockUnit(studentId: string, unitId: string, unlock: boolean) {
  const sid = uuid.parse(studentId);
  const { db, uid } = await staff();
  if (unlock) await db.from('unit_unlocks').upsert({ student_id: sid, unit_id: unitId, unlocked_by: uid });
  else await db.from('unit_unlocks').delete().eq('student_id', sid).eq('unit_id', unitId);
  revalidatePath(`/professora/alunos/${sid}`);
}

const assignSchema = z.object({
  studentId: uuid,
  title: z.string().trim().min(3, 'Dê um título à tarefa.').max(120),
  unitId: z.string().min(1),
  due: z.string().min(1, 'Escolha o prazo.'),
});

export async function createAssignment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = assignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const due = new Date(`${parsed.data.due}T23:59:00-03:00`);
  if (Number.isNaN(due.getTime())) return { error: 'Prazo inválido.' };
  const { db, uid } = await staff();
  const { error } = await db.from('assignments').insert({ teacher_id: uid, student_id: parsed.data.studentId, title: parsed.data.title, unit_id: parsed.data.unitId, due_at: due.toISOString() });
  if (error) return { error: 'Não foi possível atribuir. O aluno está vinculado a você?' };
  revalidatePath('/professora/tarefas');
  return { ok: 'Tarefa atribuída. O aluno vê no início.' };
}

export async function gradeAssignment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ id: uuid, grade: z.coerce.number().min(0).max(10).optional(), feedback: z.string().trim().max(2000) }).safeParse({ ...Object.fromEntries(form), grade: form.get('grade') || undefined });
  if (!parsed.success) return { error: 'A nota vai de 0 a 10.' };
  const { db } = await staff();
  const { error } = await db.from('assignments').update({ teacher_grade: parsed.data.grade ?? null, teacher_feedback: parsed.data.feedback || null, status: 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', parsed.data.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/professora/tarefas');
  return { ok: 'Feedback salvo. O aluno já vê.' };
}

// ---- admin ----
const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(1),
  answers: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  hint: z.string().trim().optional(),
  needs_review: z.string().optional(),
});

export async function saveQuestion(_: FormState, form: FormData): Promise<FormState> {
  const parsed = questionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Preencha enunciado, respostas e explicação.' };
  const { db, role } = await staff();
  if (role !== 'admin') return { error: 'Só o admin edita conteúdo.' };
  const answers = parsed.data.answers.split('\n').map((s) => s.trim()).filter(Boolean);
  const { error } = await db.from('questions').update({ prompt: parsed.data.prompt, answers, explanation: parsed.data.explanation, hint: parsed.data.hint || null, needs_review: parsed.data.needs_review === 'on' }).eq('id', parsed.data.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/admin/conteudo');
  return { ok: 'Questão salva.' };
}

export async function saveVocab(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ id: z.string().min(1), fr: z.string().trim().min(1), pt: z.string().trim().min(1), pron: z.string().trim().optional(), needs_review: z.string().optional() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Preencha francês e português.' };
  const { db, role } = await staff();
  if (role !== 'admin') return { error: 'Só o admin edita conteúdo.' };
  const { error } = await db.from('vocab_items').update({ fr: parsed.data.fr, pt: parsed.data.pt, pron: parsed.data.pron || null, needs_review: parsed.data.needs_review === 'on' }).eq('id', parsed.data.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/admin/conteudo');
  return { ok: 'Item salvo.' };
}

export async function publishLegal(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ kind: z.enum(['privacy', 'terms']), title: z.string().trim().min(3), body: z.string().trim().min(20, 'O texto está curto demais.') }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { db, role } = await staff();
  if (role !== 'admin') return { error: 'Só o admin publica documentos.' };
  const { data: last } = await db.from('legal_documents').select('version').eq('kind', parsed.data.kind).order('version', { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from('legal_documents').insert({ kind: parsed.data.kind, version: ((last?.version as number | undefined) ?? 0) + 1, title: parsed.data.title, body_md: parsed.data.body });
  if (error) return { error: 'Não foi possível publicar.' };
  revalidatePath('/admin/documentos');
  return { ok: 'Nova versão publicada. Novos cadastros aceitam essa versão.' };
}
