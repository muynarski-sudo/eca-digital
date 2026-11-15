import type { Question } from '../../src/lib/content/schema';

type Opts = {
  hint?: string;
  tags?: string[];
  diff?: 1 | 2 | 3;
  src?: 'ebook' | 'generated';
  review?: boolean;
  skill?: Question['skill'];
};
const n: Record<string, number> = {};
function mk(unit: string, type: Question['type'], prompt: string, answers: string[], explanation: string, o: Opts = {}): Question {
  n[unit] = (n[unit] ?? 0) + 1;
  return {
    id: `q-${unit}-${String(n[unit]).padStart(3, '0')}`,
    unit,
    type,
    skill: o.skill ?? 'gramatica',
    prompt,
    answers,
    ...(o.hint ? { hint: o.hint } : {}),
    explanation,
    error_tags: o.tags ?? [],
    difficulty: o.diff ?? 1,
    source: o.src ?? 'ebook',
    needs_review: o.review ?? false,
  };
}
const fb = (u: string, p: string, a: string[], e: string, o?: Opts) => mk(u, 'fill_blank', p, a, e, o);
const tr = (u: string, p: string, a: string[], e: string, o?: Opts) => mk(u, 'translate_pt_fr', p, a, e, { skill: 'vocabulario', ...o });
const wo = (u: string, p: string, a: string[], e: string, o?: Opts) => mk(u, 'write_out', p, a, e, o);

const etreHint = 'Verbo être: je suis, tu es, il est, nous sommes, vous êtes, ils sont.';

export const ebookQuestions: Question[] = [
  // U01
  fb('u01', 'Bonjour, je _______ Claire. (Bom dia, eu sou Claire.)', ['suis'], 'Com "je", o verbo être fica "suis".', { hint: etreHint, tags: ['conjugacao_etre'] }),
  fb('u01', 'Vous _______ brésilien(ne) ? (Você é brasileiro(a)?)', ['êtes'], 'Com "vous", o verbo être fica "êtes".', { hint: etreHint, tags: ['conjugacao_etre', 'acentuacao'] }),
  fb('u01', 'Nous _______ à l\'école. (Nós estamos na escola.)', ['sommes'], 'Com "nous", o verbo être fica "sommes".', { hint: etreHint, tags: ['conjugacao_etre'] }),
  fb('u01', 'Il _______ ici ? (Ele está aqui?)', ['est'], 'Com "il", o verbo être fica "est".', { hint: etreHint, tags: ['conjugacao_etre'] }),

  // U03 (frases do capítulo)
  tr('u03', 'Bom dia, eu gostaria de um café, por favor.', ['Bonjour, j\'aimerais un café, s\'il vous plaît.', 'Bonjour, j\'aimerais un café, s\'il vous plaît'], 'Para pedir com educação, use j\'aimerais (eu gostaria) e feche com s\'il vous plaît.', { diff: 2, tags: ['cortesia'] }),
  tr('u03', 'A conta, por favor.', ['L\'addition, s\'il vous plaît.'], 'A conta é "l\'addition".', { tags: ['vocabulario_viagem'] }),
  tr('u03', 'Eu tenho uma reserva.', ['J\'ai une réservation.'], 'Avoir + une réservation. "Je ai" vira "j\'ai".', { tags: ['elisao_apostrofo'] }),
  tr('u03', 'Onde fica a estação de trem, por favor?', ['Où est la gare, s\'il vous plaît ?'], '"Où est..." pergunta onde algo fica. Atenção ao acento de "où".', { diff: 2, tags: ['vocabulario_viagem', 'acentuacao'] }),
  tr('u03', 'Quanto custa um bilhete?', ['Combien coûte un billet ?'], '"Combien coûte..." pergunta o preço.', { diff: 2, tags: ['vocabulario_viagem'] }),
  tr('u03', 'Com licença, onde fica o banheiro, por favor?', ['Excusez-moi, où sont les toilettes, s\'il vous plaît ?'], 'No francês, "toilettes" é plural, então usamos "où sont".', { diff: 3, tags: ['vocabulario_viagem'] }),
  wo('u03', 'Escreva por extenso: 22', ['vingt-deux'], 'A partir de 21, soma-se a unidade com hífen: vingt-deux.', { skill: 'vocabulario', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 21', ['vingt et un'], 'No 21, 31, 41... usa-se "et": vingt et un.', { skill: 'vocabulario', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 71', ['soixante et onze'], 'O 70 é 60+10. O 71 usa "et": soixante et onze.', { skill: 'vocabulario', diff: 2, tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 73', ['soixante-treize'], '70 + 3 = soixante-treize (60 + 13).', { skill: 'vocabulario', diff: 2, tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 81', ['quatre-vingt-un'], '80 é 4x20. O 81 não leva "et": quatre-vingt-un.', { skill: 'vocabulario', diff: 3, tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 91', ['quatre-vingt-onze'], '90 é 80+10: quatre-vingt-onze.', { skill: 'vocabulario', diff: 3, tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 92', ['quatre-vingt-douze'], '90 é 80+10: quatre-vingt-douze.', { skill: 'vocabulario', diff: 3, tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 45', ['quarante-cinq'], 'Dezena + hífen + unidade: quarante-cinq.', { skill: 'vocabulario', src: 'generated', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 58', ['cinquante-huit'], 'Dezena + hífen + unidade: cinquante-huit.', { skill: 'vocabulario', src: 'generated', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 64', ['soixante-quatre'], 'Dezena + hífen + unidade: soixante-quatre.', { skill: 'vocabulario', src: 'generated', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 85', ['quatre-vingt-cinq'], '80 + 5, sem "et": quatre-vingt-cinq.', { skill: 'vocabulario', diff: 3, src: 'generated', tags: ['numeros'] }),
  wo('u03', 'Escreva por extenso: 99', ['quatre-vingt-dix-neuf'], '80 + 19: quatre-vingt-dix-neuf.', { skill: 'vocabulario', diff: 3, src: 'generated', tags: ['numeros'] }),

  // U04 (gabarito pág. 24)
  fb('u04', 'Transforme em negativa: "Je parle français."', ['Je ne parle pas français'], 'Negativa: sujeito + ne + verbo + pas + complemento.', { tags: ['negacao_ne_pas'] }),
  fb('u04', 'Transforme em negativa: "Il mange une pizza."', ['Il ne mange pas de pizza'], 'Na negativa, o artigo (une) vira "de": pas de pizza.', { diff: 2, tags: ['negacao_de'] }),
  fb('u04', 'Transforme em negativa: "J\'ai deux chiens."', ['Je n\'ai pas de chien'], 'Antes de vogal, "ne" vira n\'. E a quantidade vira "pas de".', { diff: 2, tags: ['negacao_de', 'elisao_apostrofo'] }),
  fb('u04', 'Transforme em negativa: "Il mange trois cookies."', ['Il ne mange pas de cookies'], 'Na negativa, o número ou artigo vira "de".', { diff: 2, tags: ['negacao_de'] }),
  fb('u04', 'Transforme em negativa: "Il mange de la viande."', ['Il ne mange pas de viande'], 'Na negativa, "de la" vira "de".', { diff: 2, tags: ['negacao_de'] }),
  fb('u04', 'Transforme em pergunta: "Vous avez une voiture."', ['Vous avez une voiture ?', 'Est-ce que vous avez une voiture ?', 'Avez-vous une voiture ?'], 'Três formas: entonação, est-ce que ou inversão.', { tags: ['interrogativa'] }),
  fb('u04', 'Transforme em pergunta: "Ils vont au restaurant."', ['Est-ce qu\'ils vont au restaurant ?', 'Ils vont au restaurant ?', 'Vont-ils au restaurant ?'], 'Com est-ce que, "que" vira "qu\'" antes de vogal.', { diff: 2, tags: ['interrogativa', 'elisao_apostrofo'] }),
  fb('u04', '_______ êtes-vous ? (Onde você está?)', ['Où'], '"Où" (com acento) pergunta lugar.', { tags: ['interrogativa', 'acentuacao'] }),
  fb('u04', 'Il parle français _______ anglais. (Ele fala francês e inglês.)', ['et'], '"et" liga informações.', { tags: ['conectivos'] }),

  // U05
  fb('u05', 'Nous _______ un examen demain. (avoir)', ['avons'], 'Avoir com nous: avons.', { tags: ['conjugacao_avoir'] }),
  fb('u05', 'Ils _______ une grande maison. (avoir)', ['ont'], 'Avoir com ils/elles: ont.', { tags: ['conjugacao_avoir'] }),
  fb('u05', 'Tu _______ de la chance ! (avoir)', ['as'], 'Avoir com tu: as.', { tags: ['conjugacao_avoir'] }),
  fb('u05', 'J\'_______ un chien. (avoir)', ['ai'], 'Avoir com je: j\'ai.', { tags: ['conjugacao_avoir', 'elisao_apostrofo'] }),
  fb('u05', 'On _______ un rendez-vous aujourd\'hui. (avoir)', ['a'], 'Avoir com il/elle/on: a.', { tags: ['conjugacao_avoir'] }),
  fb('u05', 'Vous _______ du vélo le week-end ? (faire)', ['faites'], 'Faire com vous: faites.', { tags: ['conjugacao_faire'] }),
  fb('u05', 'Je _______ mes devoirs tous les jours. (faire)', ['fais'], 'Faire com je: fais.', { tags: ['conjugacao_faire'] }),
  fb('u05', 'Ils _______ du bruit dans la classe. (faire)', ['font'], 'Faire com ils/elles: font.', { tags: ['conjugacao_faire'] }),
  tr('u05', 'Eu estou doente.', ['Je suis malade.'], 'Estar doente usa être: je suis malade.', { tags: ['conjugacao_etre'] }),
  tr('u05', 'Você tem um gato?', ['Vous avez un chat ?', 'Tu as un chat ?', 'Est-ce que vous avez un chat ?', 'Est-ce que tu as un chat ?', 'Avez-vous un chat ?', 'As-tu un chat ?'], 'Avoir + un chat. "Você" pode ser tu (informal) ou vous (formal).', { diff: 2, tags: ['conjugacao_avoir', 'interrogativa'] }),
  tr('u05', 'Nós fazemos uma caminhada.', ['Nous faisons une promenade.'], 'Faire com nous: faisons. "Faire une promenade" é dar uma caminhada.', { diff: 2, tags: ['conjugacao_faire'] }),
  tr('u05', 'Eles vão ao mercado.', ['Ils vont au marché.'], 'Aller com ils: vont. à + le = au.', { diff: 2, tags: ['conjugacao_aller', 'artigo_contraido'] }),
  tr('u05', 'Ela é estudante.', ['Elle est étudiante.'], 'Être com elle: est. Estudante no feminino: étudiante.', { tags: ['conjugacao_etre', 'concordancia_feminino'] }),

  // U06 feminino (gabarito pág. 30)
  ...[['Infirmier', 'Infirmière', 'Finais "er" viram "ère".'], ['Acteur', 'Actrice', 'Finais "teur" viram "trice".'], ['Boulanger', 'Boulangère', 'Finais "er" viram "ère".'], ['Serveur', 'Serveuse', 'Finais "eur" viram "euse".'], ['Chanteur', 'Chanteuse', 'Exceção: chanteur vira chanteuse, e não "trice".'], ['Professeur', 'Professeur', 'Professeur não muda no feminino.'], ['Musicien', 'Musicienne', 'Finais "en" dobram o n antes do e.'], ['Danseur', 'Danseuse', 'Finais "eur" viram "euse".']].map(([m, f, e]) =>
    fb('u06', `Passe para o feminino: ${m}`, [f!], e!, { diff: m === 'Chanteur' || m === 'Professeur' ? 2 : 1, tags: ['concordancia_feminino'] }),
  ),
  fb('u06', 'Coloque no feminino: "Il est un bon chirurgien."', ['Elle est une bonne chirurgienne'], 'Item pendente de revisão com nativo (gabarito do e-book).', { diff: 3, tags: ['concordancia_feminino'], review: true }),
  fb('u06', 'Coloque no feminino: "Il est jeune et beau."', ['Elle est jeune et belle'], 'Jeune não muda. Beau vira belle (irregular).', { diff: 2, tags: ['concordancia_feminino'] }),
  fb('u06', 'Coloque no feminino: "Il est très gentil."', ['Elle est très gentille'], 'Gentil vira gentille.', { diff: 2, tags: ['concordancia_feminino'] }),
  fb('u06', 'Coloque no plural: "Il est grand."', ['Ils sont grands'], 'Plural: ils sont + adjetivo com s.', { tags: ['concordancia_plural'] }),
  fb('u06', 'Coloque no plural: "Il est beau."', ['Ils sont beaux'], 'Exceção: beau vira beaux, com x.', { diff: 2, tags: ['concordancia_plural'] }),
  fb('u06', 'Coloque no plural: "Elle est brésilienne."', ['Elles sont brésiliennes'], 'Elle vira elles, est vira sont, e o adjetivo ganha s.', { diff: 2, tags: ['concordancia_plural'] }),
  fb('u06', 'Coloque no plural: "Il est français."', ['Ils sont français'], 'Palavras que já terminam em s ou x não mudam.', { diff: 2, tags: ['concordancia_plural'] }),

  // U07 artigos (pág. 31)
  fb('u07', '_______ tour Eiffel', ['La'], '"Tour" é feminino e a torre é específica: la tour Eiffel.', { tags: ['artigo_definido_indefinido'] }),
  fb('u07', '_______ pont', ['Un', 'Le'], 'Pont é masculino. Gabarito do e-book: un pont.', { tags: ['artigo_definido_indefinido'] }),
  fb('u07', '_______ vélo de Pierre', ['Le', 'Un'], 'Vélo é masculino. Gabarito do e-book: le vélo de Pierre.', { tags: ['artigo_definido_indefinido'] }),
  fb('u07', '_______ pomme', ['Une', 'La'], 'Pomme é feminino. Gabarito do e-book: une pomme.', { tags: ['artigo_definido_indefinido'] }),
  fb('u07', '_______ école de Marie', ['L\''], 'Antes de vogal, o artigo definido vira l\'.', { tags: ['artigo_definido_indefinido', 'elisao_apostrofo'] }),
  // à + artigo (pág. 32)
  fb('u07', 'Je suis _______ maison. (à + artigo)', ['à la'], 'à + la = à la.', { tags: ['artigo_contraido'] }),
  fb('u07', 'Je vais _______ Tour Eiffel. (à + artigo)', ['à la'], 'à + la = à la.', { tags: ['artigo_contraido'] }),
  fb('u07', 'Il va _______ EUA. (à + artigo)', ['aux'], 'à + les = aux.', { tags: ['artigo_contraido'] }),
  fb('u07', 'Nous sommes _______ marché. (à + artigo)', ['au'], 'à + le = au.', { tags: ['artigo_contraido'] }),
  fb('u07', 'Tu dois aller _______ école. (à + artigo)', ['à l\''], 'Antes de vogal: à l\'.', { tags: ['artigo_contraido', 'elisao_apostrofo'] }),
  // de + artigo (pág. 33)
  tr('u07', 'Os chifres do touro.', ['Les cornes du taureau'], 'de + le = du.', { diff: 2, tags: ['artigo_contraido'] }),
  tr('u07', 'O microfone do cantor.', ['Le micro du chanteur'], 'de + le = du.', { diff: 2, tags: ['artigo_contraido'] }),
  tr('u07', 'A coroa da princesa.', ['La couronne de la princesse'], 'de + la = de la.', { diff: 2, tags: ['artigo_contraido'] }),
  tr('u07', 'Os livros dos alunos.', ['Les livres des élèves'], 'de + les = des.', { diff: 2, tags: ['artigo_contraido'] }),
  // possessivos (pág. 34)
  fb('u07', '_______ frère (meu irmão)', ['Mon'], 'Frère é masculino: mon.', { tags: ['possessivo'] }),
  fb('u07', '_______ soeur (minha irmã)', ['Ma'], 'Soeur é feminino: ma.', { tags: ['possessivo'] }),
  fb('u07', '_______ amis (meus amigos)', ['Mes'], 'Plural: mes.', { tags: ['possessivo'] }),
  ...(
    [
      ['J\'aime [___] parents.', 'mes', 'Parents é plural: mes.'],
      ['[___] mère est très jolie et intelligente.', 'ma', 'Mère é feminino: ma.'],
      ['... et [___] père est patient et amusant.', 'mon', 'Père é masculino: mon.'],
      ['Parfois, je joue chez [___] ami Jean.', 'mon', 'Antes de vogal usa-se mon: mon ami.'],
      ['[___] parents travaillent "home office", alors, ils sont toujours à la maison. (os pais de Jean)', 'ses', 'Plural de "dele": ses.'],
      ['[___] frère habite aussi avec lui, (o irmão de Jean)', 'son', 'Frère é masculino: son.'],
      ['... mais [___] soeur habite en Italie. (a irmã de Jean)', 'sa', 'Soeur é feminino: sa.'],
      ['Nous avons les mêmes amis, mais [___] amis ne sortent pas beaucoup', 'nos', 'Plural de "nosso": nos.'],
      ['... parce que [___] parents ne laissent pas.', 'ses', 'Plural de "dele/dela": ses.'],
    ] as const
  ).map(([frag, a, e]) => fb('u07', `Texto: complete com o possessivo. ${frag}`, [a], e, { diff: 2, tags: ['possessivo'] })),
  // demonstrativos (pág. 35)
  ...(
    [
      ['_______ livre est intéressant', 'Ce'], ['_______ fille est jolie', 'Cette'], ['J\'aime _______ chanson', 'cette'],
      ['Tu connais _______ acteur', 'cet'], ['_______ appartement est petit', 'Cet'], ['_______ robes sont à moi', 'Ces'],
    ] as const
  ).map(([p, a]) => fb('u07', p, [a], a === 'Cet' || a === 'cet' ? 'Antes de vogal ou h, masculino usa cet.' : 'Escolha pelo gênero e número: ce, cette, ces.', { tags: ['demonstrativo'] })),

  // U08 (págs. 36-40)
  fb('u08', 'Quel est le premier jour de la semaine ?', ['Lundi'], 'A semana francesa começa na segunda-feira: lundi.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  fb('u08', 'Quels sont les jours du week-end ?', ['Samedi et dimanche'], 'Fim de semana: samedi et dimanche.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  fb('u08', 'Après le jeudi, c\'est _______', ['vendredi'], 'Depois de jeudi vem vendredi.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  fb('u08', 'Le troisième jour de la semaine est le _______', ['mercredi'], 'Lundi, mardi, mercredi: o terceiro é mercredi.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  fb('u08', 'Le mois de Noël est en _______', ['décembre'], 'Natal é em décembre.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  fb('u08', 'Généralement, le carnaval au Brésil se passe en _______', ['février', 'mars'], 'Gabarito do e-book: février. Mars também é aceito, pois o carnaval pode cair em março.', { tags: ['dias_meses'], skill: 'vocabulario' }),
  ...(
    [
      ['10h15', 'Dix heures et quart', 'Il est dix heures et quart'], ['12h', 'Midi', 'Il est midi'], ['00h', 'Minuit', 'Il est minuit'],
      ['11h30', 'Onze heures trente', 'Il est onze heures trente', 'Onze heures et demie', 'Il est onze heures et demie'],
      ['14h40', 'Trois heures moins vingt', 'Il est trois heures moins vingt'],
      ['18h45', 'Sept heures moins le quart', 'Il est sept heures moins le quart'],
      ['8h50', 'Neuf heures moins dix', 'Il est neuf heures moins dix'],
    ] as const
  ).map(([t, ...a]) => wo('u08', `Escreva a hora por extenso: ${t}`, [...a], 'Até 30 minutos some os minutos. Depois de 30, diminua da próxima hora (moins).', { diff: 2, tags: ['horas'], skill: 'vocabulario' })),
  wo('u08', 'Escreva a hora por extenso: 15h30', ['Trois heures et demie', 'Il est trois heures et demie'], 'Meia hora: et demie.', { diff: 2, tags: ['horas'], src: 'generated', skill: 'vocabulario' }),
  wo('u08', 'Escreva a hora por extenso: 20h15', ['Huit heures et quart', 'Il est huit heures et quart'], 'Quinze minutos: et quart.', { diff: 2, tags: ['horas'], src: 'generated', skill: 'vocabulario' }),
  ...(
    [['Complete: En _______, il fait très chaud et on va souvent à la plage.', 'été'], ['Complete: En _______, les arbres perdent leurs feuilles.', 'automne'],
     ['Complete: En _______, il neige et on porte des vêtements chauds.', 'hiver'], ['Complete: En _______, les fleurs commencent à pousser.', 'printemps']] as const
  ).map(([p, a]) => fb('u08', p, [a], 'O e-book usa "en" para as estações. Atenção: no francês padrão, primavera costuma ser "au printemps". Item registrado em content/REVIEW.md.', { tags: ['estacoes_clima'], skill: 'vocabulario' })),
  ...(
    [['En hiver, _______.', 'Il fait froid'], ['En été, _______.', 'Il fait chaud'], ['Aujourd\'hui, _______, le ciel est bleu.', 'Il fait beau'],
     ['En automne, souvent, _______.', 'Il pleut'], ['En décembre au Canada, _______ beaucoup.', 'Il neige']] as const
  ).map(([p, a]) => fb('u08', p, [a], 'Para o tempo usamos "il": il fait chaud, il fait froid, il fait beau, il pleut, il neige.', { diff: 2, tags: ['estacoes_clima'], skill: 'vocabulario' })),

  // U09 (pág. 43)
  ...(
    [['Le chat est _______ la table. (embaixo)', 'sous'], ['La voiture est _______ la maison. (na frente)', 'devant'], ['Le livre est _______ le sac. (dentro)', 'dans'],
     ['Je vais _______ mes parents. (na casa dos meus pais)', 'chez'], ['La France est _______ la Suisse. (perto)', 'près de'],
     ['La France est _______ du Brésil. (longe)', 'loin']] as const
  ).map(([p, a]) => fb('u09', p, [a], 'Preposições de lugar: sous (embaixo), devant, dans, chez, près de, loin de.', { diff: 2, tags: ['preposicao_lugar'], skill: 'vocabulario' })),
  tr('u09', 'Tem um livro em cima da mesa.', ['Il y a un livre sur la table.'], '"Il y a" indica existência.', { diff: 2, tags: ['il_y_a'] }),
  tr('u09', 'Há três cadeiras na sala.', ['Il y a trois chaises dans la salle.'], '"Il y a" não muda com o plural.', { diff: 2, tags: ['il_y_a'] }),
  tr('u09', 'É a casa da Marie.', ['C\'est la maison de Marie.'], '"C\'est" identifica algo.', { tags: ['c_est'] }),
  tr('u09', 'Eu vou ao médico.', ['Je vais chez le médecin.'], 'Para ir a um profissional, use chez + a pessoa.', { diff: 2, tags: ['chez'] }),
  tr('u09', 'Eu estou na casa da minha mãe.', ['Je suis chez ma mère.'], 'chez + possessivo: chez ma mère.', { diff: 2, tags: ['chez', 'possessivo'] }),

  // U10 (pág. 47)
  fb('u10', 'Je voudrais _______ (um prato principal).', ['un plat principal'], 'Plat principal é o prato principal do cardápio.', { tags: ['vocabulario_viagem'], skill: 'vocabulario' }),
  fb('u10', 'Où est la _______ (estação de trem) ?', ['gare'], 'Gare é a estação de trem.', { tags: ['vocabulario_viagem'], skill: 'vocabulario' }),
  fb('u10', 'Appelez une _______, s\'il vous plaît. (ambulância)', ['ambulance'], 'Une ambulance, como em português.', { tags: ['vocabulario_viagem'], skill: 'vocabulario' }),
  tr('u10', 'Eu gostaria de um bilhete para Paris.', ['Je voudrais un billet pour Paris.'], 'Je voudrais = eu gostaria. Pour indica destino.', { diff: 2, tags: ['vocabulario_viagem'] }),
  tr('u10', 'Preciso de um médico.', ['J\'ai besoin d\'un médecin.'], '"Avoir besoin de" = precisar de.', { diff: 3, tags: ['vocabulario_viagem', 'elisao_apostrofo'] }),
  tr('u10', 'Vire à direita.', ['Tournez à droite.'], 'Tournez é o imperativo de tourner (virar), formal.', { diff: 2, tags: ['vocabulario_viagem'] }),
];
