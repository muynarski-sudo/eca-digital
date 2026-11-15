import { createHash, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { seedContent } from '@/lib/content/seed';

export const MIN_PASSWORD = 10;

/** Comparação em tempo constante (hash dos dois lados para igualar o tamanho). */
export function sameToken(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  return timingSafeEqual(
    createHash('sha256').update(given).digest(),
    createHash('sha256').update(expected).digest(),
  );
}

export async function adminExists(db: SupabaseClient): Promise<boolean> {
  const { count, error } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export type SetupResult =
  { ok: true; email: string; contentLoaded: boolean } | { ok: false; error: string };

/**
 * Cria a primeira conta de administradora (a instrutora) e carrega o conteúdo do e-book.
 * Só funciona uma vez: exige o código de instalação (SETUP_TOKEN, definido no servidor) e que ainda não exista administradora.
 */
export async function setupFirstAdmin(
  db: SupabaseClient,
  input: { token: string; name: string; email: string; password: string },
  expectedToken: string | undefined,
): Promise<SetupResult> {
  if (!expectedToken)
    return { ok: false, error: 'A instalação inicial está desligada neste servidor.' };
  if (await adminExists(db)) return { ok: false, error: 'A instalação inicial já foi feita.' };
  if (!sameToken(input.token, expectedToken))
    return { ok: false, error: 'Código de instalação incorreto.' };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) return { ok: false, error: 'Diga o nome da instrutora.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Confira o e-mail.' };
  if (input.password.length < MIN_PASSWORD)
    return { ok: false, error: `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.` };

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) {
    return {
      ok: false,
      error: /already|registered|exists/i.test(error?.message ?? '')
        ? 'Já existe um usuário com esse e-mail.'
        : 'Não foi possível criar a conta.',
    };
  }
  const { error: upErr } = await db
    .from('profiles')
    .update({ role: 'admin', full_name: name })
    .eq('id', data.user.id);
  if (upErr)
    return {
      ok: false,
      error: 'A conta foi criada, mas não consegui torná-la administradora. Tente de novo.',
    };
  let contentLoaded = true;
  try {
    await seedContent(db);
  } catch {
    contentLoaded = false; // dá para carregar depois, pelo painel
  }
  return { ok: true, email, contentLoaded };
}
