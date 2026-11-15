'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { seedContent } from '@/lib/content/seed';
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

export async function registerStudent(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, 'Diga o nome do aluno.').max(120),
      email: z.string().trim().toLowerCase().email('Confira o e-mail.'),
      password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(72),
      days: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const days = parsed.data.days ? Number(parsed.data.days) : null;
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650))
    return {
      error: 'Dias de acesso: um número de 1 a 3650, ou deixe em branco para sem data final.',
    };
  const { uid } = await staff();
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.name },
  });
  if (error || !data.user)
    return {
      error: /already|registered|exists/i.test(error?.message ?? '')
        ? 'Já existe um cadastro com esse e-mail.'
        : 'Não foi possível cadastrar o aluno.',
    };
  const sid = data.user.id;
  await admin.from('profiles').update({ full_name: parsed.data.name }).eq('id', sid);
  await admin.from('teacher_students').upsert({ teacher_id: uid, student_id: sid });
  await admin.from('subscriptions').upsert(
    {
      student_id: sid,
      status: 'active',
      origin: 'manual',
      external_id: `manual-${sid}`,
      valid_until: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
    },
    { onConflict: 'origin,external_id' },
  );
  revalidatePath('/professora');
  return {
    ok: `Aluno cadastrado. Passe estes dados a ele: e-mail ${parsed.data.email} e senha ${parsed.data.password}. A senha não aparece de novo.`,
  };
}

async function ownStudent(studentId: string) {
  const id = uuid.parse(studentId);
  const { db, role } = await staff();
  const { data } = await db
    .from('profiles')
    .select('id,full_name,email')
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle();
  if (!data) throw new Error('Aluno não encontrado entre os seus alunos.');
  return {
    id,
    role,
    name: ((data as { full_name: string | null; email: string }).full_name ??
      (data as { email: string }).email) as string,
  };
}

export async function resetStudentPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      studentId: uuid,
      password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(72),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id } = await ownStudent(parsed.data.studentId);
  const { error } = await adminClient().auth.admin.updateUserById(id, {
    password: parsed.data.password,
  });
  if (error) return { error: 'Não foi possível trocar a senha.' };
  return { ok: `Nova senha definida: ${parsed.data.password}. Ela não aparece de novo.` };
}

/** Descadastrar: apaga a conta do aluno e todos os dados dele (cascata no banco) e as gravações de voz. */
export async function unregisterStudent(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ studentId: uuid, confirm: z.string() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Pedido inválido.' };
  if (parsed.data.confirm.trim().toUpperCase() !== 'EXCLUIR')
    return { error: 'Digite EXCLUIR para confirmar.' };
  const { id } = await ownStudent(parsed.data.studentId);
  const admin = adminClient();
  const { data: recs } = await admin
    .from('voice_recordings')
    .select('storage_path')
    .eq('student_id', id);
  if (recs?.length)
    await admin.storage
      .from('recordings')
      .remove((recs as Array<{ storage_path: string }>).map((r) => r.storage_path));
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: 'Não foi possível descadastrar agora.' };
  revalidatePath('/professora');
  redirect('/professora?descadastrado=1');
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
  const parsed = z
    .object({ studentId: uuid, days: z.coerce.number().int().min(1).max(366) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe quantos dias de acesso (1 a 366).' };
  const { db } = await staff();
  const until = new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
  const { data: cur } = await db
    .from('subscriptions')
    .select('id')
    .eq('student_id', parsed.data.studentId)
    .eq('origin', 'manual')
    .maybeSingle();
  const { error } = cur
    ? await db
        .from('subscriptions')
        .update({ status: 'active', valid_until: until, updated_at: new Date().toISOString() })
        .eq('id', cur.id)
    : await db.from('subscriptions').insert({
        student_id: parsed.data.studentId,
        status: 'active',
        origin: 'manual',
        external_id: `manual-${parsed.data.studentId}`,
        valid_until: until,
      });
  if (error) return { error: 'Não foi possível conceder o acesso.' };
  revalidatePath(`/professora/alunos/${parsed.data.studentId}`);
  return { ok: `Acesso manual até ${new Date(until).toLocaleDateString('pt-BR')}.` };
}

export async function revokeManualAccess(studentId: string) {
  const id = uuid.parse(studentId);
  const { db } = await staff();
  await db
    .from('subscriptions')
    .update({ status: 'canceled', valid_until: new Date().toISOString() })
    .eq('student_id', id)
    .eq('origin', 'manual');
  revalidatePath(`/professora/alunos/${id}`);
}

export async function unlockUnit(studentId: string, unitId: string, unlock: boolean) {
  const sid = uuid.parse(studentId);
  const { db, uid } = await staff();
  if (unlock)
    await db.from('unit_unlocks').upsert({ student_id: sid, unit_id: unitId, unlocked_by: uid });
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
  const { error } = await db.from('assignments').insert({
    teacher_id: uid,
    student_id: parsed.data.studentId,
    title: parsed.data.title,
    unit_id: parsed.data.unitId,
    due_at: due.toISOString(),
  });
  if (error) return { error: 'Não foi possível atribuir. O aluno está vinculado a você?' };
  revalidatePath('/professora/tarefas');
  return { ok: 'Tarefa atribuída. O aluno vê no início.' };
}

export async function gradeAssignment(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      id: uuid,
      grade: z.coerce.number().min(0).max(10).optional(),
      feedback: z.string().trim().max(2000),
    })
    .safeParse({ ...Object.fromEntries(form), grade: form.get('grade') || undefined });
  if (!parsed.success) return { error: 'A nota vai de 0 a 10.' };
  const { db } = await staff();
  const { error } = await db
    .from('assignments')
    .update({
      teacher_grade: parsed.data.grade ?? null,
      teacher_feedback: parsed.data.feedback || null,
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id);
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
  const answers = parsed.data.answers
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const { error } = await db
    .from('questions')
    .update({
      prompt: parsed.data.prompt,
      answers,
      explanation: parsed.data.explanation,
      hint: parsed.data.hint || null,
      needs_review: parsed.data.needs_review === 'on',
    })
    .eq('id', parsed.data.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/admin/conteudo');
  return { ok: 'Questão salva.' };
}

export async function saveVocab(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      id: z.string().min(1),
      fr: z.string().trim().min(1),
      pt: z.string().trim().min(1),
      pron: z.string().trim().optional(),
      needs_review: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Preencha francês e português.' };
  const { db, role } = await staff();
  if (role !== 'admin') return { error: 'Só o admin edita conteúdo.' };
  const { error } = await db
    .from('vocab_items')
    .update({
      fr: parsed.data.fr,
      pt: parsed.data.pt,
      pron: parsed.data.pron || null,
      needs_review: parsed.data.needs_review === 'on',
    })
    .eq('id', parsed.data.id);
  if (error) return { error: 'Não foi possível salvar.' };
  revalidatePath('/admin/conteudo');
  return { ok: 'Item salvo.' };
}

/** Carrega (ou atualiza) as unidades, o vocabulário e as questões do e-book no banco. Só admin. */
export async function reloadContent() {
  const { role } = await staff();
  if (role !== 'admin') throw new Error('Só o admin carrega conteúdo.');
  await seedContent(adminClient());
  revalidatePath('/admin/conteudo');
  redirect('/admin/conteudo?carregado=1');
}

export async function publishLegal(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      kind: z.enum(['privacy', 'terms']),
      title: z.string().trim().min(3),
      body: z.string().trim().min(20, 'O texto está curto demais.'),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { db, role } = await staff();
  if (role !== 'admin') return { error: 'Só o admin publica documentos.' };
  const { data: last } = await db
    .from('legal_documents')
    .select('version')
    .eq('kind', parsed.data.kind)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from('legal_documents').insert({
    kind: parsed.data.kind,
    version: ((last?.version as number | undefined) ?? 0) + 1,
    title: parsed.data.title,
    body_md: parsed.data.body,
  });
  if (error) return { error: 'Não foi possível publicar.' };
  revalidatePath('/admin/documentos');
  return { ok: 'Nova versão publicada. Novos cadastros aceitam essa versão.' };
}
