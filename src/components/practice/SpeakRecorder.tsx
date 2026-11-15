'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SpeechResponse {
  transcript: string;
  words: Array<{ word: string; understood: boolean }>;
  extra: string[];
  ratio: number;
  verdict: 'correct' | 'almost' | 'wrong';
  expected: string;
  explanation: string;
  error?: string;
}

export function SpeakRecorder({ questionId, assignmentId, onDone }: { questionId: string; assignmentId?: string | null; onDone: (r: SpeechResponse) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'sending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Seu navegador não permite gravar áudio. Tente o Chrome ou o Safari atualizado.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setPhase('sending');
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'fala.webm');
        form.append('questionId', questionId);
        form.append('elapsedMs', String(Date.now() - startedAt.current));
        if (assignmentId) form.append('assignmentId', assignmentId);
        if (keep) form.append('keep', '1');
        try {
          const res = await fetch('/api/speech', { method: 'POST', body: form });
          const json = (await res.json()) as SpeechResponse;
          if (!res.ok) throw new Error(json.error ?? 'Falha ao enviar.');
          onDone(json);
          setPhase('idle');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Falha ao enviar.');
          setPhase('idle');
        }
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setPhase('recording');
    } catch {
      setError('Não consegui acessar o microfone. Libere a permissão no navegador e tente de novo.');
    }
  };

  return (
    <div className="space-y-3">
      {phase === 'recording' ? (
        <Button variant="danger" onClick={() => recorder.current?.stop()}>
          <span aria-hidden="true">■</span> Parar e enviar
        </Button>
      ) : (
        <Button onClick={start} disabled={phase === 'sending'}>
          <span aria-hidden="true">●</span> {phase === 'sending' ? 'Analisando…' : 'Gravar minha voz'}
        </Button>
      )}
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="mt-1 h-4 w-4" />
        Guardar minha gravação por 30 dias para eu ouvir depois (você pode apagar quando quiser).
      </label>
      {phase === 'recording' && <p role="status" className="font-bold text-brand-red-text">Gravando… fale a frase com calma.</p>}
      {error && <p role="alert" className="font-bold text-brand-red-text"><span aria-hidden="true">✗ </span>{error}</p>}
    </div>
  );
}
