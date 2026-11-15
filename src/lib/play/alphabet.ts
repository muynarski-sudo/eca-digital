/**
 * Alfabeto francês para a área lúdica.
 *
 * ATENÇÃO: o alfabeto do capítulo 2 do e-book segue pendente de revisão com nativo (content/REVIEW.md) e continua fora dos
 * exercícios e dos flashcards. Aqui o responsável pediu o alfabeto completo na área "Brincar", então os nomes das letras
 * e a pronúncia aportuguesada foram escritos por esta plataforma (`source: "generated"`) e devem ser conferidos por um nativo.
 * Onde o e-book traz uma pronúncia para a letra, ela foi mantida.
 */
export interface Letter {
  letter: string;
  /** Nome da letra em francês, como se escreve (e como a voz do navegador lê). */
  name: string;
  /** Pronúncia aportuguesada, como nos demais conteúdos do app. */
  pron: string;
  /** De onde veio a pronúncia: "ebook" quando o e-book já traz, senão "generated". */
  pronSource: 'ebook' | 'generated';
}

const L = (
  letter: string,
  name: string,
  pron: string,
  pronSource: Letter['pronSource'] = 'generated',
): Letter => ({ letter, name, pron, pronSource });

export const ALPHABET: Letter[] = [
  L('A', 'a', 'a'),
  L('B', 'bé', 'bê'),
  L('C', 'cé', 'sê'),
  L('D', 'dé', 'dê'),
  L('E', 'eu', 'êu (som fechado, boca em bico)'),
  L('F', 'effe', 'éf'),
  L('G', 'gé', 'jê'),
  L('H', 'ache', 'áche', 'ebook'),
  L('I', 'i', 'i'),
  L('J', 'ji', 'jí', 'ebook'),
  L('K', 'ka', 'cá'),
  L('L', 'elle', 'éle', 'ebook'),
  L('M', 'emme', 'ém'),
  L('N', 'enne', 'én'),
  L('O', 'o', 'ô'),
  L('P', 'pé', 'pê'),
  L('Q', 'ku', 'quiu (boca em bico)', 'ebook'),
  L('R', 'erre', 'érr (R da garganta)'),
  L('S', 'esse', 'és'),
  L('T', 'té', 'tê'),
  L('U', 'u', 'ú (boca em bico)', 'ebook'),
  L('V', 'vé', 'vê'),
  L('W', 'double vé', 'dúbl vê', 'ebook'),
  L('X', 'iks', 'íks', 'ebook'),
  L('Y', 'i grec', 'i grék', 'ebook'),
  L('Z', 'zède', 'zéd', 'ebook'),
];

export const letterByChar = (c: string) => ALPHABET.find((l) => l.letter === c.toUpperCase());

/** Letra inicial da palavra-chave de um item de vocabulário (ignora artigo, acento e apóstrofo). */
export function headLetter(fr: string): string | null {
  const head = fr
    .replace(/^(le|la|les|un|une|l')\s?/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const c = head[0]?.toUpperCase() ?? '';
  return /^[A-Z]$/.test(c) ? c : null;
}

/** Uma palavra do e-book para cada letra que tiver (escolha estável). Letras sem palavra no e-book ficam sem exemplo. */
export function exampleWords(
  vocab: Array<{ fr: string; pt: string }>,
): Record<string, { fr: string; pt: string }> {
  const out: Record<string, { fr: string; pt: string }> = {};
  const clean = vocab.filter(
    (v) => !/[()/…?]/.test(v.fr) && v.fr.length <= 22 && !/\s.*\s/.test(v.fr),
  );
  for (const v of clean) {
    const h = headLetter(v.fr);
    if (!h) continue;
    // prefere palavra curta e simples; mantém a primeira entre as mais curtas
    const cur = out[h];
    if (!cur || v.fr.length < cur.fr.length) out[h] = { fr: v.fr, pt: v.pt };
  }
  return out;
}
