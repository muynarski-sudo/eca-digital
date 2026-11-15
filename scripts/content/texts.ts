import type { CultureTip, Dialogue, Phrase } from '../../src/lib/content/schema';

export const dialogues: Dialogue[] = [
  {
    id: 'd-u01-001', unit: 'u01', title: 'Apresentações', scene: 'André e Claire se conhecendo.', source: 'ebook', needs_review: false,
    lines: [
      { speaker: 'André', fr: 'Bonjour, je m\'appelle André. Et vous, comment vous appelez-vous ?', pt: 'Bom dia, meu nome é André. E você, como se chama?', pron: 'Bom ju, jô mapele André. Ê vu, comon vuzapelê vu?' },
      { speaker: 'Claire', fr: 'Bonjour, je m\'appelle Claire. Enchantée.', pt: 'Bom dia, meu nome é Claire. Prazer.', pron: 'Bom ju, jô mapele Cler anchantê' },
      { speaker: 'André', fr: 'Enchanté, Claire. Comment ça va ?', pt: 'Prazer, Claire. Como você está?', pron: 'Anchantê, Cler. Comon ça vá?' },
      { speaker: 'Claire', fr: 'Ça va bien, merci. Et vous ?', pt: 'Estou bem, obrigada. E você?', pron: 'Ça vá bian, merci, ê vu?' },
      { speaker: 'André', fr: 'Très bien, merci.', pt: 'Muito bem, obrigado.', pron: 'Tré bian, merci' },
    ],
  },
  {
    id: 'd-u10-001', unit: 'u10', title: 'Na estação de trem', scene: 'Comprando uma passagem.', source: 'ebook', needs_review: false,
    lines: [
      { speaker: 'Vous', fr: 'Bonjour, je voudrais un billet pour Lyon.', pt: 'Bom dia, eu queria um bilhete para Lyon.' },
      { speaker: 'Agent', fr: 'Aller simple ou aller-retour ?', pt: 'Só ida ou ida e volta?' },
      { speaker: 'Vous', fr: 'Aller-retour, s\'il vous plaît.', pt: 'Ida e volta, por favor.' },
    ],
  },
  {
    // A tradução desta cena não está no e-book: foi acrescentada e precisa de revisão.
    id: 'd-u10-002', unit: 'u10', title: 'No restaurante', scene: 'Fazendo o pedido.', source: 'generated', needs_review: false,
    lines: [
      { speaker: 'Serveur', fr: 'Bonjour, vous avez choisi ?', pt: 'Bom dia, já escolheu?' },
      { speaker: 'Vous', fr: 'Oui, je voudrais un steak et un verre de vin rouge.', pt: 'Sim, eu gostaria de um bife e uma taça de vinho tinto.' },
    ],
  },
];

type P = [unit: string, situation: string, fr: string, pt: string, pron?: string];
const rows: P[] = [
  ['u01', 'Cumprimentar', 'Bonjour, comment ça va ?', 'Bom dia, como você está?'],
  ['u01', 'Cumprimentar', 'Ça va bien, merci. Et vous ?', 'Estou bem, obrigado(a). E você?', 'Ça vá bian, merci, ê vu?'],
  ['u01', 'Apresentar-se', 'Je m\'appelle Claire.', 'Eu me chamo Claire.', 'Jô má-péle'],
  ['u01', 'Apresentar-se', 'Je suis étudiant.', 'Eu sou estudante.', 'Jô suízêtudian'],
  ['u01', 'Apresentar-se', 'Je suis brésilien(ne).', 'Eu sou brasileiro(a).', 'jô suí brêzilian(e)'],
  ['u01', 'Apresentar-se', 'Nous sommes ici.', 'Nós estamos aqui.', 'nu somezicí'],
  ['u01', 'Pedir ajuda', 'Vous pouvez m\'aider, s\'il vous plaît ?', 'Você pode me ajudar, por favor?', 'Vú puvê mêdê, si vu plé?'],
  ['u02', 'Praticar pronúncia', 'Bonjour, comment ça va ?', 'Bom dia, como você está?'],
  ['u02', 'Praticar pronúncia', 'Merci beaucoup.', 'Muito obrigado(a).'],
  ['u02', 'Praticar pronúncia', 'Où est la gare ?', 'Onde fica a estação?'],
  ['u03', 'No café', 'Bonjour, j\'aimerais un café, s\'il vous plaît.', 'Bom dia, eu gostaria de um café, por favor.'],
  ['u03', 'Pedindo informações', 'Excusez-moi, où sont les toilettes, s\'il vous plaît ?', 'Com licença, onde fica o banheiro, por favor?'],
  ['u03', 'Pedindo informações', 'Bonjour, est-ce que vous savez où est cette adresse ?', 'Bom dia, você sabe onde fica esse endereço?'],
  ['u03', 'No restaurante', 'L\'addition, s\'il vous plaît.', 'A conta, por favor.'],
  ['u03', 'No restaurante', 'Bonjour, c\'est combien, s\'il vous plaît ?', 'Bom dia, quanto custa, por favor?'],
  ['u03', 'Compras', 'Je voudrais six pommes, s\'il vous plaît.', 'Eu queria seis maçãs, por favor.'],
  ['u03', 'Compras', 'J\'aimerais un kilo de carottes, s\'il vous plaît.', 'Eu gostaria de um quilo de cenouras, por favor.'],
  ['u03', 'No hotel', 'J\'ai une réservation au nom de Dupont.', 'Eu tenho uma reserva em nome de Dupont.'],
  ['u03', 'Na estação', 'Où est le quai du train pour Lyon ?', 'Onde fica a plataforma do trem para Lyon?'],
  ['u03', 'No táxi', 'Pouvez-vous m\'emmener à l\'aéroport ?', 'Você pode me levar ao aeroporto?'],
  ['u03', 'Transporte', 'Excusez-moi, où est l\'arrêt du bus 43 ?', 'Com licença, onde fica o ponto do ônibus 43?'],
  ['u03', 'Transporte', 'Quelle ligne pour aller à la Tour Eiffel ?', 'Qual linha para ir à Torre Eiffel?'],
  ['u03', 'Transporte', 'À quelle heure part le prochain bateau ?', 'A que horas sai o próximo barco?'],
  ['u03', 'Transporte', 'Combien coûte un billet ?', 'Quanto custa um bilhete?'],
  ['u04', 'Perguntar', 'Parlez-vous français ?', 'Você fala francês?'],
  ['u04', 'Perguntar', 'Est-ce que tu parles français ?', 'Você fala francês?'],
  ['u04', 'Perguntar', 'Comment allez-vous ?', 'Como você está?'],
  ['u04', 'Negar', 'Je ne sais pas.', 'Eu não sei.'],
  ['u04', 'Negar', 'Il est brésilien, mais il habite en France.', 'Ele é brasileiro, mas mora na França.'],
  ['u05', 'Dia a dia', 'J\'ai faim. Où est le restaurant ?', 'Eu tenho fome. Onde é o restaurante?'],
  ['u05', 'Dia a dia', 'Je vais au marché.', 'Eu vou ao mercado.'],
  ['u05', 'Dia a dia', 'Nous faisons les courses au marché.', 'Nós fazemos compras no mercado.'],
  ['u05', 'Dia a dia', 'Il fait beau aujourd\'hui.', 'Está um dia bonito hoje.'],
  ['u05', 'Dia a dia', 'Elle va au cinéma.', 'Ela vai ao cinema.'],
  ['u07', 'Pedir comida', 'Je voudrais du poulet.', 'Eu queria frango.'],
  ['u07', 'Pedir comida', 'J\'aimerais de la soupe.', 'Eu gostaria de sopa.'],
  ['u08', 'Horas', 'Quelle heure est-il ?', 'Que horas são?', 'quéle hórr é til'],
  ['u08', 'Horas', 'Il est midi.', 'É meio-dia.'],
  ['u08', 'Clima', 'Quel temps fait-il ?', 'Que tempo está fazendo?'],
  ['u08', 'Clima', 'Il pleut.', 'Está chovendo.'],
  ['u09', 'Localização', 'Le livre est dans le sac.', 'O livro está dentro da mochila.'],
  ['u09', 'Localização', 'Le chat est sous la table.', 'O gato está debaixo da mesa.'],
  ['u09', 'Localização', 'Il y a un café à côté de l\'hôtel.', 'Tem um café ao lado do hotel.'],
  ['u09', 'Localização', 'Où est mon portable ?', 'Onde está meu celular?', 'U é mon portable?'],
  ['u09', 'Localização', 'Je suis chez ma mère.', 'Eu estou na casa da minha mãe.'],
  ['u10', 'Aeroporto', 'Où est la porte d\'embarquement ?', 'Onde é o portão de embarque?'],
  ['u10', 'Aeroporto', 'Je voudrais un billet pour Paris.', 'Eu gostaria de um bilhete para Paris.'],
  ['u10', 'Restaurante', 'Je voudrais voir le menu, s\'il vous plaît.', 'Eu gostaria de ver o cardápio, por favor.'],
  ['u10', 'Restaurante', 'Je prends un café et une salade.', 'Eu vou querer um café e uma salada.'],
  ['u10', 'Restaurante', 'Pour le dessert, une crème brûlée, s\'il vous plaît.', 'De sobremesa, um crème brûlée, por favor.'],
  ['u10', 'Emergência', 'J\'ai besoin d\'un médecin.', 'Eu preciso de um médico.'],
  ['u10', 'Emergência', 'Appelez une ambulance, s\'il vous plaît !', 'Chame uma ambulância, por favor!'],
  ['u10', 'Emergência', 'Où est l\'hôpital le plus proche ?', 'Onde fica o hospital mais perto?'],
  ['u10', 'Emergência', 'J\'ai besoin d\'un médicament pour la fièvre.', 'Eu preciso de um remédio para febre.'],
  ['u10', 'Direções', 'Est-ce que c\'est loin ?', 'É longe?'],
  ['u10', 'Direções', 'Tournez à droite.', 'Vire à direita.'],
  ['u10', 'Direções', 'Où est la pharmacie ?', 'Onde fica a farmácia?'],
];
export const phrases: Phrase[] = rows.map(([unit, situation, fr, pt, pron], i) => ({
  id: `ph-${unit}-${String(i + 1).padStart(3, '0')}`, unit, situation, fr, pt, ...(pron ? { pron } : {}), source: 'ebook' as const, needs_review: false,
}));

const tips: Array<[string, string, string]> = [
  ['u01', 'Bonjour ou salut?', 'Na França, a saudação depende do contexto. "Salut" é usado em situações informais, como entre amigos, enquanto "Bonjour" é preferido em situações formais. Para se despedir à tarde, você também pode dizer "bonne après-midi".'],
  ['u01', 'Tu ou vous?', 'Use "tu" com amigos, familiares, crianças ou pessoas da sua idade em momentos descontraídos. Jamais use "tu" para pedir informação na rua a um desconhecido. "Vous" é a forma de respeito e também o plural.'],
  ['u02', 'Os acentos têm sons opostos', 'O acento agudo tem som de circunflexo e vice-versa: É soa como "ê" e Ê soa como "é". Exemplo: être (étre), Brésil (brêzil).'],
  ['u02', 'Espelho ajuda', 'Pratique a pronúncia em frente ao espelho para observar os movimentos da boca.'],
  ['u03', 'Números sem pânico', 'Os números franceses parecem complexos, mas não faça matemática: pense na pronúncia de cada um. Com o tempo sai natural.'],
  ['u03', 'Polidez vale muito', 'Os franceses valorizam a polidez. Bonjour, merci e s\'il vous plaît causam uma ótima impressão.'],
  ['u04', 'No dia a dia o "ne" some', 'Em conversas informais, muita gente não pronuncia o "ne", só o "pas": "je sais pas". Para começar, pratique a forma completa.'],
  ['u04', 'Só dois "porquês"', 'Em francês, "pourquoi" é para perguntar e "parce que" é para responder.'],
  ['u07', 'Como pedir comida', 'Para pedir ou dizer que comeu algo, os franceses usam du, de la e des: "je voudrais du poulet", "j\'ai mangé de la pizza". Para falar da comida em si, usam-se os artigos definidos: "le chocolat suisse est incroyable".'],
  ['u08', 'Horas na fala', 'No francês do dia a dia dizemos "quatre heures" para 16h. Só em contextos formais se usa "seize heures".'],
  ['u09', 'Ou e où', 'Sem acento, "ou" significa "ou" e se pronuncia "ô". Com acento, "où" significa "onde" e se pronuncia "u".'],
  ['u09', 'Casa de alguém', '"Chez" serve para a casa de alguém ou o local de trabalho de um profissional: chez moi, chez le médecin.'],
];
export const culture: CultureTip[] = tips.map(([unit, title, text], i) => ({
  id: `c-${unit}-${String(i + 1).padStart(3, '0')}`, unit, title, text, source: 'ebook' as const, needs_review: false,
}));
