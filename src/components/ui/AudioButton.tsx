'use client';
import { useRef, useState } from 'react';

/** Toca o áudio de referência. Se o arquivo não existir, usa a voz do navegador quando houver texto de apoio. */
export function AudioButton({
  audioKey,
  fallbackText,
  label = 'Ouvir',
}: {
  audioKey?: string;
  fallbackText?: string;
  label?: string;
}) {
  const [state, setState] = useState<'idle' | 'playing' | 'missing'>('idle');
  const ref = useRef<HTMLAudioElement | null>(null);

  const speak = () => {
    if (!fallbackText || typeof window === 'undefined' || !('speechSynthesis' in window))
      return setState('missing');
    const u = new SpeechSynthesisUtterance(fallbackText);
    u.lang = 'fr-FR';
    u.onend = () => setState('idle');
    u.onerror = () => setState('missing');
    setState('playing');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const play = async () => {
    if (!audioKey) return speak();
    setState('playing');
    try {
      const a = new Audio(`/api/audio?k=${audioKey}`);
      ref.current = a;
      a.onended = () => setState('idle');
      a.onerror = () => (fallbackText ? speak() : setState('missing'));
      await a.play();
    } catch {
      if (fallbackText) speak();
      else setState('missing');
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
          Áudio indisponível por enquanto.
        </span>
      )}
    </span>
  );
}
