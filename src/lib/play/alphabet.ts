/**
 * Alfabeto francês para a área lúdica.
 *
 * ATENÇÃO: o alfabeto do capítulo 2 do e-book segue pendente de revisão com nativo (content/REVIEW.md) e continua fora dos
 * exercícios e dos flashcards. Aqui o responsável pediu o alfabeto completo na área "Brincar", então os nomes das letras
 * e a pronúncia aportuguesada foram escritos por esta plataforma (`source: "generated"`) e devem ser conferidos por um nativo.
 * Onde o e-book traz uma pronúncia para a letra, ela foi mantida.
 *
 * ÁUDIO: o nome de uma letra NÃO pode ser entregue à voz como texto comum, porque a voz lê como palavra e erra: "eu" sai
 * como [y] (o som do U), "emme" sai nasal ([ɑ̃m]), "iks" perde o S, "esse" sai [es]. Por isso cada letra tem o som exato
 * em IPA (`ipa`), e o arquivo de áudio é gerado a partir desse IPA (scripts/play_audio.py), sem passar pela leitura de texto.
 * `spoken` é só a reserva: o texto (escrito de modo que a voz do aparelho leia certo) para quando não há arquivo de áudio.
 */
export interface Letter {
  letter: string;
  /** Nome da letra em francês, como se escreve (é o que aparece na tela). */
  name: string;
  /** Texto para a voz do aparelho ler quando não há arquivo de áudio. Também dá nome ao arquivo (chave do clipe). */
  spoken: string;
  /** Som exato do nome da letra, em IPA (alfabeto fonético). Fonte do áudio gravado. */
  ipa: string;
  /** Pronúncia aportuguesada, como nos demais conteúdos do app. */
  pron: string;
  /** De onde veio a pronúncia: "ebook" quando o e-book já traz, senão "generated". */
  pronSource: 'ebook' | 'generated';
}

const L = (
  letter: string,
  name: string,
  spoken: string,
  ipa: string,
  pron: string,
  pronSource: Letter['pronSource'] = 'generated',
): Letter => ({ letter, name, spoken, ipa, pron, pronSource });

// IPA dos nomes das letras: Wiktionary (fr) / Académie française. "ˈ" marca a sílaba tônica, como o espeak faz.
export const ALPHABET: Letter[] = [
  L('A', 'a', 'a', 'ˈa', 'a'),
  L('B', 'bé', 'bé', 'bˈe', 'bê'),
  L('C', 'cé', 'cé', 'sˈe', 'sê'),
  L('D', 'dé', 'dé', 'dˈe', 'dê'),
  L('E', 'e', 'euh', 'ˈø', 'ê com os lábios em bico (como o "eu" de "peu")'),
  L('F', 'effe', 'èf', 'ˈɛf', 'éf'),
  L('G', 'gé', 'gé', 'ʒˈe', 'jê'),
  L('H', 'hache', 'ache', 'ˈaʃ', 'áche', 'ebook'),
  L('I', 'i', 'i', 'ˈi', 'i'),
  L('J', 'ji', 'ji', 'ʒˈi', 'jí', 'ebook'),
  L('K', 'ka', 'ka', 'kˈa', 'cá'),
  L('L', 'elle', 'èl', 'ˈɛl', 'éle', 'ebook'),
  L('M', 'emme', 'èm', 'ˈɛm', 'ém'),
  L('N', 'enne', 'èn', 'ˈɛn', 'én'),
  L('O', 'o', 'o', 'ˈo', 'ô'),
  L('P', 'pé', 'pé', 'pˈe', 'pê'),
  L('Q', 'ku', 'ku', 'kˈy', 'quiu (boca em bico, som do U francês)'),
  L('R', 'erre', 'èr', 'ˈɛʁ', 'érr (R da garganta)'),
  L('S', 'esse', 'ès', 'ˈɛs', 'és'),
  L('T', 'té', 'té', 'tˈe', 'tê'),
  L('U', 'u', 'u', 'ˈy', 'i com os lábios em bico (não é o "u" do português)'),
  L('V', 'vé', 'vé', 'vˈe', 'vê'),
  L('W', 'double vé', 'double vé', 'dˈublə vˈe', 'dúbl vê', 'ebook'),
  L('X', 'ix', 'ix', 'ˈiks', 'íks', 'ebook'),
  L('Y', 'i grec', 'i grec', 'ˈi ɡʁˈɛk', 'i grék', 'ebook'),
  L('Z', 'zède', 'zèd', 'zˈɛd', 'zéd', 'ebook'),
];

export const letterByChar = (c: string) => ALPHABET.find((l) => l.letter === c.toUpperCase());

/** Avisos sobre letras com uma particularidade. */
export const LETTER_NOTE: Record<string, string> = {
  H: 'O H é mudo em francês: dentro das palavras ele não tem som nenhum. O nome da letra é "áche".',
};

/** O som do nome da letra em IPA, para mostrar na tela, sem o acento de sílaba tônica: ˈø vira [ø]. */
export const ipaShow = (l: Pick<Letter, 'ipa'>) => `[${l.ipa.replace(/ˈ/g, '')}]`;
