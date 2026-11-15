'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Msg { role: 'user' | 'assistant'; content: string; tip?: string | null }

export function Conversation({ scenario, opening }: { scenario: string; opening: { fr: string; pt: string } }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: opening.fr }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const next: Msg[] = [...msgs, { role: 'user', content: text.trim() }];
    setMsgs(next); setText(''); setBusy(true); setError(null);
    try {
      const res = await fetch('/api/conversation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario, messages: next.map(({ role, content }) => ({ role, content })) }) });
      const json = (await res.json()) as { reply?: string; tip?: string | null; error?: string };
      if (!res.ok || !json.reply) throw new Error(json.error ?? 'Falha.');
      setMsgs([...next, { role: 'assistant', content: json.reply, tip: json.tip }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <ul className="space-y-2" aria-live="polite">
        {msgs.map((m, i) => (
          <li key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <span lang="fr" className={`inline-block rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-brand-blue text-white' : 'bg-brand-tint text-brand-blue-dark'}`}>{m.content}</span>
            {m.tip && <p className="mt-1 text-sm text-ink-soft"><span aria-hidden="true">ℹ </span>{m.tip}</p>}
          </li>
        ))}
        <li className="text-sm text-ink-muted">{opening.pt}</li>
      </ul>
      <div>
        <label htmlFor="msg" className="mb-1 block font-bold">Sua resposta em francês</label>
        <input id="msg" className="field" lang="fr" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && !busy && send()} maxLength={400} />
      </div>
      {error && <p role="alert" className="font-bold text-brand-red-text"><span aria-hidden="true">✗ </span>{error}</p>}
      <Button onClick={send} disabled={busy || !text.trim()}>{busy ? 'Pensando…' : 'Enviar'}</Button>
      <p className="text-xs text-ink-muted">A conversa não é guardada. O texto é processado por um provedor de IA.</p>
    </Card>
  );
}
