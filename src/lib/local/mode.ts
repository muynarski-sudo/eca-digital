/** Modo local: o app roda sem Supabase, com um banco embutido (PGlite) e login próprio. */
export function isLocalMode(): boolean {
  if (process.env.APP_BACKEND === 'supabase') return false;
  if (process.env.APP_BACKEND === 'local') return true;
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const LOCAL_COOKIE = 'ff_session';
export const LOCAL_DATA_DIR = process.env.LOCAL_DATA_DIR ?? '.local-data';
/** Só para uso local. Em produção o app usa o Supabase Auth. */
export const localSecret = () =>
  process.env.LOCAL_SESSION_SECRET ?? 'segredo-somente-para-uso-local';
