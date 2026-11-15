import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/lib/local/session';
import { generatePassword, hashPassword, verifyPassword } from '@/lib/local/password';

describe('sessão local', () => {
  it('aceita cookie válido e rejeita adulterado, expirado ou de outro segredo', async () => {
    const c = await signSession('s1', 'user-1', 1_000_000);
    expect(await verifySession('s1', c, 1_000_000)).toBe('user-1');
    expect(await verifySession('s2', c, 1_000_000)).toBeNull();
    expect(await verifySession('s1', c.replace('user-1', 'user-2'), 1_000_000)).toBeNull();
    expect(await verifySession('s1', c, 1_000_000 + 8 * 24 * 3600 * 1000)).toBeNull();
    expect(await verifySession('s1', '', 1)).toBeNull();
    expect(await verifySession('s1', undefined, 1)).toBeNull();
  });
});

describe('senhas locais', () => {
  it('hash com sal, verificação e geração legível', () => {
    const h = hashPassword('aluno123');
    expect(h).not.toContain('aluno123');
    expect(verifyPassword('aluno123', h)).toBe(true);
    expect(verifyPassword('aluno124', h)).toBe(false);
    expect(verifyPassword('x', null)).toBe(false);
    expect(hashPassword('aluno123')).not.toBe(h);
    expect(generatePassword()).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
  });
});
