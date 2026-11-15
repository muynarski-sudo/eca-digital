import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export function loadEnv() {
  for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f);
}

export function serviceClient() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env (veja .env.example).');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
