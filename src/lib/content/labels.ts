/** Nome legível de cada categoria de vocabulário. */
export const CATEGORY_LABELS: Record<string, string> = {
  saudacoes: 'saudações',
  pronomes: 'pronomes',
  descricoes: 'descrições',
  pronuncia_r: 'som do R',
  vogais_nasais: 'vogais nasais',
  vogais_juntas: 'vogais juntas',
  ille_tion: 'ille e tion',
  cortesia: 'cortesia',
  viagem: 'viagem',
  interrogativas: 'palavras de pergunta',
  ligacao: 'palavras de ligação',
  verbos: 'verbos',
  expressoes_avoir: 'expressões com avoir',
  feminino: 'feminino',
  artigos: 'artigos',
  possessivos: 'possessivos',
  demonstrativos: 'demonstrativos',
  dias: 'dias da semana',
  meses: 'meses',
  horas: 'horas',
  estacoes: 'estações',
  clima: 'clima',
  preposicoes_lugar: 'preposições de lugar',
  expressoes: 'expressões',
  aeroporto: 'aeroporto',
  restaurante: 'restaurante',
  emergencias: 'emergências',
  direcoes: 'direções',
  numeros: 'números',
  alfabeto: 'alfabeto',
};
export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ');

/** Assuntos da prática: nome, descrição curta e ícone. */
export const TOPIC_INFO: Record<string, { label: string; hint: string; icon: string }> = {
  apresentacao: { label: 'Apresentação', hint: 'Cumprimentar, dizer quem você é', icon: '👋' },
  dia_a_dia: { label: 'Dia a dia', hint: 'Frases e palavras do cotidiano', icon: '🏠' },
  viagem: {
    label: 'Viagem',
    hint: 'Aeroporto, transporte, hotel, direções, emergências',
    icon: '✈️',
  },
  restaurante: {
    label: 'Restaurante e pedidos',
    hint: 'Pedir comida, bebida e a conta',
    icon: '🍽️',
  },
  compras: { label: 'Compras', hint: 'Mercado, preços e quantidades', icon: '🛒' },
  trabalho: { label: 'Trabalho e profissões', hint: 'Profissões e como falar delas', icon: '💼' },
  horario: { label: 'Horário do dia', hint: 'Que horas são, manhã, tarde e noite', icon: '🕒' },
  calendario: { label: 'Dias, meses e clima', hint: 'Semana, meses, estações e tempo', icon: '📅' },
  numeros: { label: 'Números', hint: 'De 0 a 99', icon: '🔢' },
  localizacao: { label: 'Localização', hint: 'Onde as coisas estão', icon: '📍' },
  pronuncia: { label: 'Pronúncia', hint: 'Alfabeto e sons do francês', icon: '🗣️' },
  gramatica: { label: 'Gramática básica', hint: 'Verbos, artigos, feminino e plural', icon: '📘' },
};
export const topicLabel = (t: string) => TOPIC_INFO[t]?.label ?? t;

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Iniciante',
  2: 'Intermediário',
  3: 'Avançado',
};

/** Níveis do Quadro Europeu (CEFR), com uma descrição para o aluno escolher. */
export const CEFR_INFO: Record<string, { name: string; hint: string }> = {
  A1: { name: 'Iniciante', hint: 'Frases simples do dia a dia, no presente.' },
  A2: { name: 'Básico', hint: 'Passado e planos simples, situações cotidianas.' },
  B1: { name: 'Intermediário', hint: 'Histórias, experiências e opiniões em vários tempos.' },
  B2: { name: 'Intermediário superior', hint: 'Textos mais longos e argumentos.' },
  C1: { name: 'Avançado', hint: 'Textos densos, vocabulário preciso.' },
  C2: { name: 'Proficiente', hint: 'Textos elaborados e nuances de estilo.' },
};
