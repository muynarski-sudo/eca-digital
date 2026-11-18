/**
 * Níveis da trilha A1, na ordem do e-book. Cada nível trata de UM assunto só (saudações, despedidas, apresentação...).
 * O aluno faz todas as questões do nível, vê a pontuação e só então o próximo abre. Nada de misturar assuntos ou tempos verbais.
 */
export interface Stage {
  id: string;
  title: string;
  /** o que se aprende neste nível */
  hint: string;
  /** capítulo do e-book (unidade) de onde vem */
  unit: string;
}

export const STAGES: Stage[] = [
  { id: 'saudacoes', unit: 'u01', title: 'Saudações', hint: 'Bonjour, salut, bonsoir, ça va ?' },
  {
    id: 'despedidas',
    unit: 'u01',
    title: 'Despedidas',
    hint: 'Au revoir, à demain, à bientôt, bonne nuit...',
  },
  {
    id: 'apresentacao',
    unit: 'u01',
    title: 'Apresentação',
    hint: 'Dizer o seu nome, perguntar o nome, nacionalidade e profissão.',
  },
  {
    id: 'pronomes',
    unit: 'u01',
    title: 'Pronomes',
    hint: 'je, tu, il, elle, nous, vous... e a diferença entre tu e vous.',
  },
  {
    id: 'verbo-etre',
    unit: 'u01',
    title: 'Verbo être (ser/estar)',
    hint: 'Só o presente do verbo être.',
  },
  {
    id: 'pronuncia',
    unit: 'u02',
    title: 'Pronúncia',
    hint: 'O som do R, vogais nasais, vogais juntas, ille e tion.',
  },
  {
    id: 'cortesia',
    unit: 'u03',
    title: 'Cortesia do dia a dia',
    hint: 'Merci, de rien, s’il vous plaît, excusez-moi.',
  },
  {
    id: 'pedidos-compras',
    unit: 'u03',
    title: 'Pedidos e compras',
    hint: 'Pedir um café, a conta, perguntar o preço, comprar frutas.',
  },
  {
    id: 'numeros-1',
    unit: 'u03',
    title: 'Números de 1 a 19',
    hint: 'Por extenso e em algarismos.',
  },
  {
    id: 'numeros-2',
    unit: 'u03',
    title: 'Números de 20 a 49',
    hint: 'Dezena + unidade, com "et un" no 21, 31 e 41.',
  },
  { id: 'numeros-3', unit: 'u03', title: 'Números de 50 a 69', hint: 'cinquante e soixante.' },
  {
    id: 'numeros-4',
    unit: 'u03',
    title: 'Números de 70 a 99',
    hint: 'soixante-dix e quatre-vingt.',
  },
  {
    id: 'viagem',
    unit: 'u03',
    title: 'Palavras de viagem',
    hint: 'Hotel, táxi, ônibus, metrô, bilhete.',
  },
  {
    id: 'interrogativas',
    unit: 'u04',
    title: 'Fazer perguntas',
    hint: 'Où, quand, comment, combien, est-ce que.',
  },
  { id: 'negativa', unit: 'u04', title: 'Negar e ligar frases', hint: 'ne... pas, et, mais, ou.' },
  {
    id: 'verbo-avoir',
    unit: 'u05',
    title: 'Verbo avoir (ter)',
    hint: 'Só o presente do verbo avoir.',
  },
  {
    id: 'expressoes-avoir',
    unit: 'u05',
    title: 'Expressões com avoir',
    hint: 'Avoir faim, avoir soif, avoir froid...',
  },
  {
    id: 'verbo-faire',
    unit: 'u05',
    title: 'Verbo faire (fazer)',
    hint: 'Só o presente do verbo faire.',
  },
  {
    id: 'verbo-aller',
    unit: 'u05',
    title: 'Verbo aller (ir)',
    hint: 'Só o presente do verbo aller.',
  },
  {
    id: 'verbos-frases',
    unit: 'u05',
    title: 'Frases com os quatro verbos',
    hint: 'Usar être, avoir, faire e aller em frases do dia a dia.',
  },
  {
    id: 'feminino-plural',
    unit: 'u06',
    title: 'Feminino e plural',
    hint: 'Profissões e adjetivos no feminino; frases no plural.',
  },
  { id: 'artigos', unit: 'u07', title: 'Artigos', hint: 'le, la, l’, un, une, les.' },
  {
    id: 'contracoes',
    unit: 'u07',
    title: 'À e de com artigos',
    hint: 'au, aux, du, des, à la, de la.',
  },
  {
    id: 'possessivos',
    unit: 'u07',
    title: 'Possessivos',
    hint: 'mon, ma, mes, ton, ta, son, sa, notre...',
  },
  { id: 'demonstrativos', unit: 'u07', title: 'Demonstrativos', hint: 'ce, cet, cette, ces.' },
  {
    id: 'dias-meses',
    unit: 'u08',
    title: 'Dias da semana e meses',
    hint: 'lundi, mardi... janvier, février...',
  },
  { id: 'horas-1', unit: 'u08', title: 'Horas cheias', hint: 'Il est huit heures, midi, minuit.' },
  {
    id: 'horas-2',
    unit: 'u08',
    title: 'Quarto de hora e meia hora',
    hint: 'et quart, et demie, moins le quart.',
  },
  {
    id: 'horas-3',
    unit: 'u08',
    title: 'Minutos e "moins"',
    hint: 'dix heures cinq, trois heures moins vingt.',
  },
  {
    id: 'estacoes-clima',
    unit: 'u08',
    title: 'Estações e clima',
    hint: 'Printemps, été, automne, hiver e o tempo que faz.',
  },
  {
    id: 'localizacao',
    unit: 'u09',
    title: 'Localização',
    hint: 'Sur, sous, dans, devant, à côté de, chez, il y a.',
  },
  {
    id: 'aeroporto-direcoes',
    unit: 'u10',
    title: 'Aeroporto e direções',
    hint: 'Voo, portão, tournez à droite, tout droit.',
  },
  {
    id: 'restaurante',
    unit: 'u10',
    title: 'No restaurante',
    hint: 'Cardápio, entrada, prato principal, bebida, conta.',
  },
  {
    id: 'emergencias',
    unit: 'u10',
    title: 'Emergências',
    hint: 'Pedir um médico, uma ambulância, um remédio.',
  },
  {
    id: 'mais-verbos',
    unit: 'u05',
    title: 'Mais verbos no presente',
    hint: 'manger, boire, voir, vouloir... da tabela do e-book.',
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);
export const stageById = (id: string) => STAGES.find((s) => s.id === id);
