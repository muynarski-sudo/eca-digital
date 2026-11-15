import 'server-only';

/** Provider de reconhecimento de fala. As chaves ficam só no servidor. */
export interface SttProvider {
  readonly name: string;
  transcribe(
    audio: Uint8Array,
    mime: string,
    opts: { language: string; expectedHint?: string },
  ): Promise<string>;
}

/** Simulado: sem chave configurada devolve a frase esperada sem a última palavra (para testar a tela). */
export class MockStt implements SttProvider {
  readonly name = 'mock';
  async transcribe(
    _audio: Uint8Array,
    _mime: string,
    opts: { language: string; expectedHint?: string },
  ) {
    const words = (opts.expectedHint ?? '').split(/\s+/).filter(Boolean);
    return words.length > 2 ? words.slice(0, -1).join(' ') : words.join(' ');
  }
}

/** Compatível com a API de transcrição da OpenAI (`/v1/audio/transcriptions`). Transfere o áudio para o provedor (ver DECISIONS.md). */
export class OpenAiCompatibleStt implements SttProvider {
  readonly name = 'openai-compatible';
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com',
    private readonly model = 'whisper-1',
  ) {}
  async transcribe(audio: Uint8Array, mime: string, opts: { language: string }) {
    const form = new FormData();
    form.append('file', new Blob([audio as BlobPart], { type: mime }), 'fala.webm');
    form.append('model', this.model);
    form.append('language', opts.language);
    const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`STT falhou: HTTP ${res.status}`);
    const json = (await res.json()) as { text?: string };
    return json.text ?? '';
  }
}

export function sttFromEnv(): SttProvider {
  const key = process.env.STT_API_KEY;
  if (process.env.STT_PROVIDER === 'openai' && key)
    return new OpenAiCompatibleStt(key, process.env.STT_BASE_URL, process.env.STT_MODEL);
  return new MockStt();
}
