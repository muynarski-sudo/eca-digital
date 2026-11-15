import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { LocalClient } from '@/lib/local/client';
import { LOCAL_COOKIE, isLocalMode, localSecret } from '@/lib/local/mode';
import { verifySession } from '@/lib/local/session';

/** Cliente com a sessão do usuário (RLS ativa). No modo local usa o banco embutido. */
export async function serverClient(): Promise<SupabaseClient> {
  const store = await cookies();
  if (isLocalMode()) {
    const uid = await verifySession(localSecret(), store.get(LOCAL_COOKIE)?.value);
    return new LocalClient({
      role: uid ? 'authenticated' : 'anon',
      uid,
    }) as unknown as SupabaseClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      'Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    );
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* chamado de um Server Component: o middleware renova a sessão */
        }
      },
    },
  });
}
