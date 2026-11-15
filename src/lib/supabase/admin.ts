import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LocalClient } from '@/lib/local/client';
import { isLocalMode } from '@/lib/local/mode';

/** Cliente com service role (ignora a RLS). Só no servidor. No modo local usa o banco embutido. */
export function adminClient(): SupabaseClient {
  if (isLocalMode())
    return new LocalClient({ role: 'service', uid: null }) as unknown as SupabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      'Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)',
    );
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
