'use server';

import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { setupFirstAdmin } from '@/lib/setup/admin';
import type { FormState } from './auth';

export async function runSetup(_: FormState, form: FormData): Promise<FormState> {
  const db = adminClient();
  const result = await setupFirstAdmin(
    db,
    {
      token: String(form.get('token') ?? ''),
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    },
    process.env.SETUP_TOKEN,
  );
  if (!result.ok) return { error: result.error };
  redirect(`/login?instalado=1${result.contentLoaded ? '' : '&conteudo=pendente'}`);
}
