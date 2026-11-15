import { createHash } from 'node:crypto';

/** Chave estável do áudio de um texto em francês. */
export function audioKey(text: string): string {
  return createHash('sha1').update(text.normalize('NFC').replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 20);
}
export const audioPath = (key: string, ext = 'mp3') => `fr/${key}.${ext}`;
