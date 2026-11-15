import 'server-only';
import { systemPrompt, type Scenario } from './scenarios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ConversationReply {
  reply: string;
  tip: string | null;
}

/** Conversa guiada por IA atrás de uma interface. Desligada por padrão (AI_CONVERSATION_ENABLED=false). */
export interface ConversationProvider {
  readonly name: string;
  reply(scenario: Scenario, history: ChatMessage[]): Promise<ConversationReply>;
}

export class AnthropicConversation implements ConversationProvider {
  readonly name = 'anthropic';
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}
  async reply(scenario: Scenario, history: ChatMessage[]): Promise<ConversationReply> {
    const res = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 300,
        system: systemPrompt(scenario),
        messages: history.slice(-10),
      }),
    });
    if (!res.ok) throw new Error(`IA indisponível: HTTP ${res.status}`);
    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
    try {
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as {
        reply?: string;
        dica?: string | null;
      };
      return { reply: parsed.reply ?? text, tip: parsed.dica ?? null };
    } catch {
      return { reply: text, tip: null };
    }
  }
}

export function conversationFromEnv(): ConversationProvider | null {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (process.env.AI_CONVERSATION_ENABLED !== 'true' || !key || !model) return null;
  return new AnthropicConversation(key, model);
}
