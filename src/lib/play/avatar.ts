/** Avatar "Iasmyn" (SVG animado) e a voz que a faz falar. Roda só no navegador; sem internet usa a voz do aparelho. */

export function avatarSvg(): string {
  return `<svg class="pl-avatar" data-mouth="0" viewBox="0 0 200 232" role="img" aria-label="Iasmyn, a avatar que fala francês" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="pl-body"><path d="M24 232 C24 178 62 160 100 160 C138 160 176 178 176 232 Z"/></clipPath></defs>
  <g class="pl-bodyg">
    <path d="M24 232 C24 178 62 160 100 160 C138 160 176 178 176 232 Z" fill="#ffffff" stroke="#00346b" stroke-width="3"/>
    <g clip-path="url(#pl-body)" fill="#0055a4"><rect x="0" y="176" width="200" height="8"/><rect x="0" y="194" width="200" height="8"/><rect x="0" y="212" width="200" height="8"/></g>
    <path d="M78 160 Q100 184 122 160 L122 150 L78 150 Z" fill="#e9b98f" stroke="#00346b" stroke-width="2"/>
  </g>
  <g class="pl-head">
    <ellipse cx="100" cy="92" rx="63" ry="64" fill="#3b2a20"/>
    <ellipse cx="100" cy="98" rx="50" ry="54" fill="#f3cfae" stroke="#00346b" stroke-width="2.5"/>
    <path d="M44 62 Q100 8 156 62 Q150 40 100 34 Q52 40 44 62 Z" fill="#ef4135" stroke="#00346b" stroke-width="2.5"/>
    <ellipse cx="104" cy="46" rx="58" ry="20" fill="#ef4135" stroke="#00346b" stroke-width="2.5"/>
    <circle cx="122" cy="26" r="5.5" fill="#00346b"/>
    <path d="M72 80 Q82 74 92 80" fill="none" stroke="#3b2a20" stroke-width="3" stroke-linecap="round"/>
    <path d="M108 80 Q118 74 128 80" fill="none" stroke="#3b2a20" stroke-width="3" stroke-linecap="round"/>
    <g class="pl-eyes"><circle cx="82" cy="94" r="6.5" fill="#1f2937"/><circle cx="118" cy="94" r="6.5" fill="#1f2937"/><circle cx="84.5" cy="91.5" r="2" fill="#fff"/><circle cx="120.5" cy="91.5" r="2" fill="#fff"/></g>
    <circle cx="68" cy="112" r="8" fill="#f4a6a0" opacity=".6"/><circle cx="132" cy="112" r="8" fill="#f4a6a0" opacity=".6"/>
    <path class="m0" d="M86 122 Q100 134 114 122" fill="none" stroke="#7a2e22" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse class="m1" cx="100" cy="126" rx="11" ry="6" fill="#7a2e22"/>
    <ellipse class="m2" cx="100" cy="128" rx="14" ry="11" fill="#7a2e22"/><ellipse class="m2" cx="100" cy="134" rx="8" ry="4" fill="#e0786e"/>
  </g>
</svg>`;
}

/** Arquivos de áudio pré-gravados (um .mp3 por texto). Tocam em qualquer celular, inclusive no modo silencioso do iPhone. */
export interface Clips {
  has(text: string): boolean;
  url(text: string): string;
}

export interface Speaker {
  readonly supported: boolean;
  say(text: string, o?: { rate?: number }): Promise<void>;
  seq(
    texts: string[],
    o?: { rate?: number; gapMs?: number; onEach?: (i: number) => void },
  ): Promise<void>;
  cancel(): void;
  /** Destrava a voz em celulares que exigem um toque antes (chame dentro de um clique). */
  unlock(): void;
}

// WAV mudo de 0,05 s (8 kHz, 8 bits), só para destravar o elemento de áudio
const SILENCE = (() => {
  const n = 400;
  const h = (s: string) => s.split('').map((c) => c.charCodeAt(0));
  const le = (v: number, b: number) => Array.from({ length: b }, (_, i) => (v >> (8 * i)) & 255);
  const bytes = [
    ...h('RIFF'),
    ...le(36 + n, 4),
    ...h('WAVEfmt '),
    ...le(16, 4),
    ...le(1, 2),
    ...le(1, 2),
    ...le(8000, 4),
    ...le(8000, 4),
    ...le(1, 2),
    ...le(8, 2),
    ...h('data'),
    ...le(n, 4),
    ...new Array(n).fill(128),
  ];
  return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...bytes));
})();
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fala em francês com a voz do aparelho. Se não houver voz, finge a duração para a animação e as legendas continuarem.
 * `onProblem(true)` avisa quando a fala foi pedida mas o aparelho não começou a tocar (volume, modo silencioso, sem voz).
 */
export function createSpeaker(
  onSpeaking: (v: boolean) => void,
  onProblem: (v: boolean) => void = () => undefined,
  clips?: Clips,
): Speaker {
  const synth: SpeechSynthesis | null =
    typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let token = 0;
  let seqRun = 0;
  let unlocked = false;
  // um único elemento de áudio, liberado no primeiro toque, serve a todas as falas (exigência do iPhone)
  const audio: HTMLAudioElement | null = clips && typeof Audio !== 'undefined' ? new Audio() : null;
  if (audio) audio.preload = 'auto';
  let stopCurrent: (() => void) | null = null;

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = synth?.getVoices() ?? [];
    return (
      voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'fr-fr') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('fr'))
    );
  };
  // algumas versões do iPhone e do Chrome só carregam a lista de vozes depois do primeiro uso
  if (synth) {
    synth.getVoices();
    synth.addEventListener?.('voiceschanged', () => synth.getVoices());
  }

  const speakVoice = (text: string, o: { rate?: number }, my: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      let done = false;
      let started = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (token === my) onSpeaking(false);
        resolve();
      };
      onSpeaking(true);
      const fake = Math.max(700, text.length * 75) / (o.rate ?? 1);
      if (!synth) {
        onProblem(true);
        return void setTimeout(finish, fake);
      }
      try {
        // cancelar logo antes de falar faz o iPhone e o Chrome engolirem a fala: só cancela se houver algo tocando
        if (synth.speaking || synth.pending) synth.cancel();
        synth.resume();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        u.rate = o.rate ?? 0.9;
        u.volume = 1;
        const v = pickVoice();
        if (v) u.voice = v;
        u.onstart = () => {
          started = true;
          onProblem(false);
        };
        u.onend = finish;
        u.onerror = () => {
          if (!started) onProblem(true);
          finish();
        };
        synth.speak(u);
        // se em 1,5 s o aparelho não começou a falar, avisa (volume, modo silencioso ou sem voz)
        setTimeout(() => {
          if (!started && !done && token === my) onProblem(true);
        }, 1500);
        // alguns navegadores não disparam onend: rede de segurança
        setTimeout(finish, fake + 6000);
      } catch {
        onProblem(true);
        setTimeout(finish, fake);
      }
    });
  };

  /** Toca o arquivo de áudio do texto. Se não existir ou falhar, cai na voz do aparelho. */
  const speakClip = (text: string, o: { rate?: number }, my: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      let done = false;
      let started = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (stopCurrent === finish) stopCurrent = null;
        if (token === my) onSpeaking(false);
        resolve();
      };
      const fallback = () => {
        if (done) return;
        done = true;
        if (stopCurrent === finish) stopCurrent = null;
        void speakVoice(text, o, my).then(resolve);
      };
      stopCurrent = finish;
      onSpeaking(true);
      const a = audio!;
      a.onplaying = () => {
        started = true;
        onProblem(false);
      };
      a.onended = finish;
      a.onerror = fallback;
      a.src = clips!.url(text);
      a.playbackRate = (o.rate ?? 0.9) < 0.7 ? 0.75 : 1;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(fallback);
      setTimeout(() => {
        if (!started && !done && token === my) onProblem(true);
      }, 2500);
      setTimeout(finish, 20000);
    });
  };

  const speak = (text: string, o: { rate?: number } = {}): Promise<void> => {
    const my = ++token;
    stopCurrent?.();
    if (audio && clips?.has(text)) return speakClip(text, o, my);
    audio?.pause();
    return speakVoice(text, o, my);
  };

  return {
    supported: !!synth,
    say(text, o) {
      seqRun++; // uma fala nova interrompe a sequência em andamento
      return speak(text, o);
    },
    async seq(texts, o = {}) {
      const run = ++seqRun;
      for (let i = 0; i < texts.length; i++) {
        if (run !== seqRun) return;
        o.onEach?.(i);
        await speak(texts[i]!, { rate: o.rate });
        if (run !== seqRun) return;
        await wait(o.gapMs ?? 250);
      }
    },
    cancel() {
      seqRun++;
      token++;
      audio?.pause();
      stopCurrent?.();
      synth?.cancel();
      onSpeaking(false);
    },
    unlock() {
      if (unlocked) return;
      unlocked = true;
      if (audio) {
        try {
          // toca um áudio vazio no primeiro toque: depois disso o iPhone deixa tocar os demais
          audio.src = SILENCE;
          void audio.play().catch(() => undefined);
        } catch {
          /* ignora */
        }
      }
      if (!synth) return;
      try {
        // fala vazia e sem volume, só para o aparelho liberar a voz depois de um toque do usuário
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.lang = 'fr-FR';
        synth.speak(u);
      } catch {
        /* ignora */
      }
    },
  };
}
