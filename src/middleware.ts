import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { LOCAL_COOKIE, isLocalMode, localSecret } from '@/lib/local/mode';
import { verifySession } from '@/lib/local/session';

const PUBLIC = [
  '/login',
  '/setup',
  '/recuperar-senha',
  '/redefinir-senha',
  '/auth',
  '/politica-de-privacidade',
  '/termos',
  '/api/health',
  '/manifest.webmanifest',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));
  const toLogin = () => {
    const to = new URL('/login', req.url);
    if (path !== '/') to.searchParams.set('next', path);
    return NextResponse.redirect(to);
  };

  if (isLocalMode()) {
    const uid = await verifySession(localSecret(), req.cookies.get(LOCAL_COOKIE)?.value);
    return uid || isPublic ? res : toLogin();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return isPublic ? res : toLogin();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user || isPublic ? res : toLogin();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)'],
};
