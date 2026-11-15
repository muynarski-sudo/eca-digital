'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/supabase/server';
import { currentLegal } from '@/lib/legal/data';
import { isLocalMode } from '@/lib/local/mode';

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

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get('email'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (isLocalMode()) return { ok: 'Fale com a sua professora: ela gera uma nova senha para você.' };
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

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = password.safeParse(form.get('password'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (form.get('password') !== form.get('confirm'))
    return { error: 'As duas senhas precisam ser iguais.' };
  const db = await serverClient();
  const { error } = await db.auth.updateUser({ password: parsed.data });
  if (error) return { error: 'Não foi possível trocar a senha agora.' };
  return { ok: 'Senha trocada.' };
}

/** Primeiro acesso: registra o aceite versionado dos textos legais e do aviso de maioridade. */
export async function acceptTerms(_: FormState, form: FormData): Promise<FormState> {
  if (form.get('privacy') !== 'on' || form.get('terms') !== 'on')
    return { error: 'Para continuar, aceite a Política de Privacidade e o Termo de Uso.' };
  if (form.get('age') !== 'on')
    return { error: 'Confirme o aviso sobre maiores de 18 anos ou autorização do responsável.' };
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { error: 'Sessão expirada. Entre de novo.' };
  const [privacy, terms] = await Promise.all([
    currentLegal(db, 'privacy'),
    currentLegal(db, 'terms'),
  ]);
  const { error } = await db.from('consents').insert([
    { user_id: data.user.id, kind: 'privacy', version: privacy.version },
    { user_id: data.user.id, kind: 'terms', version: terms.version },
    { user_id: data.user.id, kind: 'age_notice', version: 1 },
  ]);
  if (error) return { error: 'Não foi possível registrar o aceite.' };
  redirect('/');
}
