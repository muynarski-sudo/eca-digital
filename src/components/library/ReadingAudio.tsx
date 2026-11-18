'use client';
import { useRef, useState } from 'react';

/** Player do texto inteiro: controles do aparelho e velocidade (normal ou devagar para acompanhar a leitura). */
export function ReadingAudio({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const set = (r: number) => {
    setRate(r);
    if (ref.current) ref.current.playbackRate = r;
  };
  return (
    <div className="space-y-2" role="group" aria-label="Áudio do texto">
      <audio
        ref={ref}
        controls
        preload="none"
        src={src}
        className="w-full"
        onPlay={() => {
          if (ref.current) ref.current.playbackRate = rate;
        }}
        onError={() => setFailed(true)}
      >
        Seu aparelho não toca áudio nesta página.
      </audio>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold text-ink-soft">Velocidade:</span>
        {[0.75, 1].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => set(r)}
            aria-pressed={rate === r}
            className={`rounded-full border-2 px-3 py-1 font-bold ${rate === r ? 'border-brand-blue bg-brand-tint text-brand-blue-dark' : 'border-line'}`}
          >
            {r === 1 ? 'Normal' : 'Devagar'}
          </button>
        ))}
      </p>
      {failed && (
        <p role="status" className="text-sm text-ink-muted">
          Não foi possível carregar o áudio agora. Confira sua conexão e tente de novo.
        </p>
      )}
    </div>
  );
}
