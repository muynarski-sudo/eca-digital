import 'server-only';

export interface TtsAudio {
  data: Uint8Array;
  ext: 'mp3' | 'wav';
  mime: string;
}
/** Provider de síntese de voz. As chaves ficam só no servidor. */
export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, opts: { lang: string; voice?: string }): Promise<TtsAudio>;
}

/** Simulado: gera um WAV curto com um tom (duração proporcional ao texto). Serve para testar o fluxo sem chave. */
export class MockTts implements TtsProvider {
  readonly name = 'mock';
  async synthesize(text: string): Promise<TtsAudio> {
    const rate = 8000;
    const seconds = Math.min(4, 0.3 + text.length * 0.04);
    const n = Math.floor(rate * seconds);
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o: number, s: string) =>
      [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF');
    v.setUint32(4, 36 + n * 2, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    w(36, 'data');
    v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++)
      v.setInt16(
        44 + i * 2,
        Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 2000 * Math.min(1, (n - i) / 800)),
        true,
      );
    return { data: new Uint8Array(buf), ext: 'wav', mime: 'audio/wav' };
  }
}

/** Compatível com `/v1/audio/speech` (OpenAI e similares). Transfere o texto ao provedor (ver DECISIONS.md). */
export class OpenAiCompatibleTts implements TtsProvider {
  readonly name = 'openai-compatible';
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com',
    private readonly model = 'tts-1',
    private readonly defaultVoice = 'alloy',
  ) {}
  async synthesize(text: string, opts: { lang: string; voice?: string }): Promise<TtsAudio> {
    const res = await fetch(`${this.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: opts.voice ?? this.defaultVoice,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) throw new Error(`TTS falhou: HTTP ${res.status}`);
    return { data: new Uint8Array(await res.arrayBuffer()), ext: 'mp3', mime: 'audio/mpeg' };
  }
}

export function ttsFromEnv(): TtsProvider {
  const key = process.env.TTS_API_KEY;
  if (process.env.TTS_PROVIDER === 'openai' && key)
    return new OpenAiCompatibleTts(
      key,
      process.env.TTS_BASE_URL,
      process.env.TTS_MODEL,
      process.env.TTS_VOICE,
    );
  return new MockTts();
}
