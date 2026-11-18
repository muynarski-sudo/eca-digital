'use client';
import { useRef, useState } from 'react';

/** Toca um arquivo de áudio gravado (funciona no iPhone, inclusive no modo silencioso). Sem arquivo, tenta a voz do aparelho. */
export function ClipButton({
  src,
  text,
  label = 'Ouvir',
}: {
  src: string;
  text?: string;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'playing' | 'missing'>('idle');
  const ref = useRef<HTMLAudioElement | null>(null);

  const speak = () => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window))
      return setState('missing');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.onend = () => setState('idle');
    u.onerror = () => setState('missing');
    setState('playing');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const play = async () => {
    setState('playing');
    try {
      const a = ref.current ?? new Audio(src);
      ref.current = a;
      a.currentTime = 0;
      a.onended = () => setState('idle');
      a.onerror = () => speak();
      await a.play();
    } catch {
      speak();
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={play}
        aria-label={label}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-blue bg-white px-4 py-2 font-bold text-brand-blue hover:bg-brand-tint"
      >
        <span aria-hidden="true">{state === 'playing' ? '◼' : '▶'}</span>
        {state === 'playing' ? 'Tocando…' : label}
      </button>
      {state === 'missing' && (
        <span role="status" className="text-sm text-ink-muted">
          Áudio indisponível neste aparelho.
        </span>
      )}
    </span>
  );
}
