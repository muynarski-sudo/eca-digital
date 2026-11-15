import 'server-only';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';

export interface Me {
  id: string;
  email: string;
  fullName: string | null;
  role: 'student' | 'teacher' | 'admin';
  access: 'active' | 'paused';
  level: string;
  hasAccess: boolean;
}

/** Usuário logado + papel + se tem acesso (assinatura ativa e perfil não pausado). Redireciona para o login se não houver sessão. */
export async function requireMe(): Promise<Me> {
  const db = await serverClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: p } = await db
    .from('profiles')
    .select('id,email,full_name,role,access,level')
    .eq('id', auth.user.id)
    .single();
  if (!p) redirect('/login');
  const { data: has } = await db.rpc('has_active_access', { uid: p.id });
  return {
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    access: p.access,
    level: p.level,
    hasAccess: has === true,
  };
}

/** Rotas do aluno: exige papel de aluno com acesso. Equipe (professora/admin) pode navegar também. */
export async function requireStudent(): Promise<Me> {
  const me = await requireMe();
  if (me.role === 'student' && !me.hasAccess) redirect('/acesso');
  return me;
}

export async function requireStaff(adminOnly = false): Promise<Me> {
  const me = await requireMe();
  if (me.role === 'student' || (adminOnly && me.role !== 'admin')) redirect('/inicio');
  return me;
}
