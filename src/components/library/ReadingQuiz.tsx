'use client';
import { useState, useTransition } from 'react';
import { answerQuestion } from '@/lib/actions/practice';
import { Button } from '@/components/ui/Button';
import type { AnswerResult, PublicQuestion } from '@/lib/practice/types';

/** Perguntas de compreensão do texto: todas na mesma tela, corrigidas de uma vez (como no lingua.com). */
export function ReadingQuiz({ questions }: { questions: PublicQuestion[] }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AnswerResult> | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const done = results !== null;
  const answered = questions.filter((q) => choice[q.id]).length;

  const check = () =>
    start(async () => {
      setError('');
      try {
        const out: Record<string, AnswerResult> = {};
        for (const q of questions)
          out[q.id] = await answerQuestion({
            questionId: q.id,
            response: choice[q.id] ?? '',
            elapsedMs: 0,
          });
        setResults(out);
      } catch {
        setError('Não foi possível corrigir agora. Tente de novo.');
      }
    });

  const right = results ? Object.values(results).filter((r) => r.verdict === 'correct').length : 0;

  return (
    <section aria-labelledby="perguntas" className="space-y-4">
      <h2 id="perguntas" className="text-xl">
        Perguntas sobre o texto
      </h2>
      <ol className="space-y-4">
        {questions.map((q, i) => {
          const r = results?.[q.id];
          return (
            <li key={q.id} className="rounded-card border border-line bg-white p-4">
              <fieldset disabled={done || pending}>
                <legend className="mb-2 font-bold">
                  {i + 1}. {q.prompt}
                </legend>
                <div className="space-y-2">
                  {(q.choices ?? []).map((c) => (
                    <label
                      key={c}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${choice[q.id] === c ? 'border-brand-blue bg-brand-tint' : 'border-line'}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={c}
                        checked={choice[q.id] === c}
                        onChange={() => setChoice((s) => ({ ...s, [q.id]: c }))}
                        className="mt-1 h-5 w-5 shrink-0"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {r && (
                <p
                  role="status"
                  className={`mt-3 rounded-xl border-2 p-3 ${r.verdict === 'correct' ? 'border-success bg-success-bg text-success-text' : 'border-brand-red-text bg-danger-bg text-brand-red-text'}`}
                >
                  <strong>
                    <span aria-hidden="true">{r.verdict === 'correct' ? '✓ ' : '✗ '}</span>
                    {r.verdict === 'correct' ? 'Certo!' : `Resposta certa: ${r.expected}`}
                  </strong>
                  <span className="mt-1 block text-ink">{r.explanation}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {error && (
        <p role="alert" className="font-bold text-brand-red-text">
          <span aria-hidden="true">✗ </span>
          {error}
        </p>
      )}
      {done ? (
        <p
          role="status"
          className="rounded-xl bg-brand-tint p-4 text-lg font-bold text-brand-blue-dark"
        >
          Você acertou {right} de {questions.length}.
        </p>
      ) : (
        <Button onClick={check} disabled={pending || answered < questions.length}>
          {pending ? 'Corrigindo…' : 'Verificar respostas'}
        </Button>
      )}
      {!done && answered < questions.length && (
        <p className="text-sm text-ink-muted">Responda todas as perguntas para verificar.</p>
      )}
    </section>
  );
}
