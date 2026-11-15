'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { currentLegal } from '@/lib/legal/data';

export interface FormState {
  error?: string;
  ok?: string;
}

const email = z.string().trim().toLowerCase().email('Confira o e-mail digitado.');
const password = z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(72);

async function siteUrl() {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
  );
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, password: z.string().min(1, 'Digite sua senha.') })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await serverClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'E-mail ou senha não conferem. Tente de novo ou recupere a senha.' };
  const next = String(form.get('next') ?? '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ name: z.string().trim().min(2, 'Diga seu nome.').max(120), email, password })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (form.get('privacy') !== 'on' || form.get('terms') !== 'on')
    return { error: 'Para criar a conta, aceite a Política de Privacidade e o Termo de Uso.' };
  if (form.get('age') !== 'on')
    return { error: 'Confirme o aviso sobre maiores de 18 anos ou autorização do responsável.' };

  const db = await serverClient();
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });
  if (error || !data.user)
    return {
      error: 'Não foi possível criar a conta. Se você já tem cadastro, entre ou recupere a senha.',
    };

  // registro de aceite versionado (service role: ainda pode não haver sessão se o e-mail precisa de confirmação)
  const [privacy, terms] = await Promise.all([
    currentLegal(db, 'privacy'),
    currentLegal(db, 'terms'),
  ]);
  await adminClient()
    .from('consents')
    .insert([
      { user_id: data.user.id, kind: 'privacy', version: privacy.version },
      { user_id: data.user.id, kind: 'terms', version: terms.version },
      { user_id: data.user.id, kind: 'age_notice', version: 1 },
    ]);
  if (data.session) redirect('/');
  return { ok: 'Quase lá! Enviamos um e-mail para confirmar seu cadastro.' };
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await serverClient();
  await db.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/redefinir-senha`,
  });
  // mesma resposta exista ou não a conta, para não revelar cadastros
  return { ok: 'Se o e-mail estiver cadastrado, enviamos o link para criar uma nova senha.' };
}

export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = password.safeParse(form.get('password'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (form.get('password') !== form.get('confirm'))
    return { error: 'As duas senhas precisam ser iguais.' };
  const db = await serverClient();
  const { error } = await db.auth.updateUser({ password: parsed.data });
  if (error) return { error: 'O link expirou. Peça um novo em "Esqueci minha senha".' };
  redirect('/');
}

export async function logout() {
  const db = await serverClient();
  await db.auth.signOut();
  redirect('/login');
}
