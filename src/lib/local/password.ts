import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 32);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Senha legível para a professora passar ao aluno (sem caracteres ambíguos como 0/O e 1/l). */
export function generatePassword(): string {
  const words = [
    'sol',
    'lua',
    'mar',
    'rio',
    'pao',
    'vinho',
    'queijo',
    'cafe',
    'paris',
    'lyon',
    'nice',
    'rosa',
    'azul',
    'bleu',
    'rouge',
    'blanc',
  ];
  const pick = () => words[randomBytes(1)[0]! % words.length]!;
  const digits = String(1000 + (randomBytes(2).readUInt16BE() % 9000));
  return `${pick()}-${pick()}-${digits}`;
}
