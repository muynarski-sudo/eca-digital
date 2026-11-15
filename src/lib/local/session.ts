/** Cookie de sessão assinado (HMAC-SHA256), com Web Crypto para funcionar também no middleware (edge). */
const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const SESSION_SECONDS = 7 * 24 * 3600;

export async function signSession(secret: string, uid: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${uid}.${exp}.${await hmac(secret, `${uid}.${exp}`)}`;
}

/** Devolve o id do usuário se o cookie for válido e não tiver expirado. */
export async function verifySession(
  secret: string,
  value: string | undefined | null,
  now = Date.now(),
): Promise<string | null> {
  if (!value) return null;
  const [uid, exp, sig] = value.split('.');
  if (!uid || !exp || !sig || Number(exp) * 1000 < now) return null;
  const expected = await hmac(secret, `${uid}.${exp}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? uid : null;
}
