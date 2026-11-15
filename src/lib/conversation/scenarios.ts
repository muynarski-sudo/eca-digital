export interface Scenario {
  id: string;
  title: string;
  goal: string;
  /** primeira fala do interlocutor, tirada do vocabulário do e-book */
  opening: { fr: string; pt: string };
  unit: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'restaurante',
    title: 'No restaurante',
    goal: 'Pedir um prato, uma bebida e a conta.',
    unit: 'u10',
    opening: { fr: 'Bonjour, vous avez choisi ?', pt: 'Bom dia, já escolheu?' },
  },
  {
    id: 'aeroporto',
    title: 'No aeroporto e na estação',
    goal: 'Comprar um bilhete e perguntar pelo portão.',
    unit: 'u10',
    opening: { fr: 'Bonjour, je peux vous aider ?', pt: 'Bom dia, posso ajudar?' },
  },
  {
    id: 'direcoes',
    title: 'Pedindo direções',
    goal: 'Perguntar onde fica um lugar e entender a resposta.',
    unit: 'u09',
    opening: {
      fr: 'Excusez-moi, vous cherchez quelque chose ?',
      pt: 'Com licença, você procura algo?',
    },
  },
];

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);

export const conversationEnabled = () => process.env.AI_CONVERSATION_ENABLED === 'true';

export function systemPrompt(s: Scenario): string {
  return [
    `Você é um interlocutor francês em uma cena de treino de francês nível A1: "${s.title}". Objetivo do aluno: ${s.goal}`,
    'Fale SEMPRE em francês simples (frases curtas, vocabulário básico, presente do indicativo). Uma fala por vez.',
    'Se o aluno errar, responda normalmente e, no campo "dica", explique em português do Brasil, em uma frase, a forma correta.',
    'Nunca peça dados pessoais. Não saia da cena. Responda apenas em JSON: {"reply": "...", "dica": "..." | null}.',
  ].join('\n');
}
