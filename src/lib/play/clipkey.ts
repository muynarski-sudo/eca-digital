/** Chave estável do arquivo de áudio de um texto (nome do .mp3). Mesma função no gerador e no navegador. */
export function normalizeSpoken(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Hash cyrb53 em hexadecimal (14 caracteres). Não é criptográfico: só dá nome ao arquivo. */
export function clipKey(text: string): string {
  const s = normalizeSpoken(text);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
