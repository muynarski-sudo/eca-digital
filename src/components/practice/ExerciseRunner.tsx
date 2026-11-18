'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { answerQuestion, revealDictationText, submitAssignment } from '@/lib/actions/practice';
import type { AnswerResult, PublicQuestion } from '@/lib/practice/types';
import { AudioButton } from '@/components/ui/AudioButton';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ClipButton } from '@/components/library/ClipButton';
import { ExerciseShell } from './ExerciseShell';
import { PairsBoard } from './PairsBoard';
import { Feedback } from './Feedback';
import { SpeakRecorder } from './SpeakRecorder';

interface Props {
  questions: PublicQuestion[];
  title?: string;
  assignmentId?: string | null;
  backHref: string;
  backLabel?: string;
  /** Endereço para sortear mais perguntas novas ao terminar. */
  moreHref?: string | null;
  moreLabel?: string;
}

const DIFFICULTY: Record<number, string> = { 1: 'fácil', 2: 'médio', 3: 'difícil' };
const TEXT_TYPES = ['fill_blank', 'translate_pt_fr', 'write_out', 'conjugate', 'dictation'];

export function ExerciseRunner({
  questions,
  title,
  assignmentId,
  backHref,
  backLabel = 'Voltar',
  moreHref = null,
  moreLabel = 'Mais 10 exercícios novos',
}: Props) {
  const [i, setI] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [speech, setSpeech] = useState<{
    words: Array<{ word: string; understood: boolean }>;
    transcript: string;
    ratio: number;
  } | null>(null);
  const [text, setText] = useState('');
  const [choice, setChoice] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [result]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState({ correct: 0, almost: 0, wrong: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();
  const t0 = useRef(Date.now());
  const q = questions[i];

  useEffect(() => {
    t0.current = Date.now();
  }, [i]);

  const finished = i >= questions.length;
  const pool = useMemo(
    () => (q?.words ?? []).filter((_, idx) => !picked.includes(`${idx}`)),
    [q, picked],
  );

  if (questions.length === 0) {
    return <Card tone="tint">Nenhum exercício disponível aqui ainda.</Card>;
  }

  if (finished) {
    const total = questions.length;
    return (
      <section className="mx-auto max-w-2xl space-y-4" aria-label="Resumo da sessão">
        <Card tone="tint" className="space-y-3 text-center">
          <h2 className="text-2xl">On y va, c&apos;est fini!</h2>
          <p className="text-lg">
            <span aria-hidden="true">✓ </span>
            {tally.correct} certas · <span aria-hidden="true">≈ </span>
            {tally.almost} quase · <span aria-hidden="true">✗ </span>
            {tally.wrong} para rever, de {total}.
          </p>
          <p className="text-ink-soft">
            O que você errou volta nas suas revisões, no momento certo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {assignmentId && !submitted && (
              <Button
                onClick={() =>
                  start(async () => {
                    await submitAssignment(assignmentId);
                    setSubmitted(true);
                  })
                }
                disabled={pending}
              >
                Entregar tarefa à professora
              </Button>
            )}
            {submitted && (
              <p role="status" className="font-bold text-success-text">
                <span aria-hidden="true">✓ </span>Tarefa entregue. Merci!
              </p>
            )}
            {moreHref && (
              <LinkButton href={`${moreHref}${moreHref.includes('?') ? '&' : '?'}n=${Date.now()}`}>
                {moreLabel}
              </LinkButton>
            )}
            <LinkButton href={backHref} variant="secondary">
              {backLabel}
            </LinkButton>
          </div>
        </Card>
      </section>
    );
  }
  if (!q) return null;

  const reset = () => {
    setResult(null);
    setSpeech(null);
    setText('');
    setChoice('');
    setPicked([]);
    setPairs({});
    setRevealed(null);
    setError(null);
  };
  const next = () => {
    reset();
    setI((n) => n + 1);
  };
  const record = (verdict: 'correct' | 'almost' | 'wrong') =>
    setTally((t) => ({ ...t, [verdict]: t[verdict] + 1 }));

  const currentResponse = (): string | { pairs: Array<{ left: string; right: string }> } => {
    if (q.type === 'multiple_choice') return choice;
    if (q.type === 'order_words')
      return picked.map((idx) => q.words?.[Number(idx)] ?? '').join(' ');
    if (q.type === 'match_pairs')
      return { pairs: Object.entries(pairs).map(([left, right]) => ({ left, right })) };
    return text;
  };
  const canSubmit =
    q.type === 'match_pairs'
      ? Object.keys(pairs).length === (q.pairs?.lefts.length ?? 0)
      : q.type === 'multiple_choice'
        ? choice !== ''
        : q.type === 'order_words'
          ? picked.length > 0
          : text.trim() !== '';

  const submit = () =>
    start(async () => {
      setError(null);
      try {
        const r = await answerQuestion({
          questionId: q.id,
          response: currentResponse(),
          elapsedMs: Date.now() - t0.current,
          assignmentId,
        });
        setResult(r);
        record(r.verdict);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
      }
    });

  const answered = result !== null || speech !== null;

  return (
    <ExerciseShell index={i} total={questions.length} title={title} exitHref={backHref}>
      {q.track === 'trilha' && q.level ? (
        <p className="text-sm font-bold text-ink-soft" aria-label="Dificuldade">
          <span aria-hidden="true" className="tracking-widest text-brand-blue">
            {'●'.repeat(q.level)}
            <span className="text-line">{'●'.repeat(3 - q.level)}</span>
          </span>{' '}
          {DIFFICULTY[q.level]}
        </p>
      ) : null}
      <p className="text-lg font-bold text-brand-blue-dark">{q.prompt}</p>
      {q.clip && <ClipButton src={q.clip.src} text={q.clip.text} label="Ouvir a palavra" />}
      {q.hint && !answered && <p className="text-ink-muted">Dica: {q.hint}</p>}

      {q.type === 'dictation' && (
        <div className="space-y-2">
          <AudioButton audioKey={q.audioKey} fallbackText={q.audioFallback} label="Ouvir a frase" />
          {!answered && !revealed && (
            <button
              type="button"
              className="block text-sm underline"
              onClick={() => start(async () => setRevealed((await revealDictationText(q.id)).text))}
            >
              Não consigo ouvir: mostrar o texto (não conta nota)
            </button>
          )}
          {revealed && (
            <div role="status" className="rounded-xl bg-brand-tint p-3">
              <p lang="fr" className="font-bold text-brand-blue-dark">
                {revealed}
              </p>
              <Button variant="secondary" className="mt-2" onClick={next}>
                Continuar
              </Button>
            </div>
          )}
        </div>
      )}

      {q.type === 'speak' && (
        <div className="space-y-3">
          <p lang="fr" className="text-2xl font-bold text-brand-blue-dark">
            {q.speakText}
          </p>
          <AudioButton audioKey={q.audioKey} fallbackText={q.speakText} label="Ouvir o modelo" />
          {!answered && (
            <SpeakRecorder
              questionId={q.id}
              assignmentId={assignmentId}
              onDone={(r) => {
                setSpeech({ words: r.words, transcript: r.transcript, ratio: r.ratio });
                record(r.verdict);
              }}
            />
          )}
        </div>
      )}

      {TEXT_TYPES.includes(q.type) && !revealed && (
        <div>
          <label htmlFor="resp" className="mb-1 block font-bold">
            Sua resposta
          </label>
          <input
            id="resp"
            className="field"
            lang="fr"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={text}
            disabled={answered}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit && !answered) submit();
            }}
          />
        </div>
      )}

      {q.type === 'multiple_choice' && (
        <fieldset disabled={answered} className="space-y-2">
          <legend className="sr-only">Escolha uma resposta</legend>
          {q.choices?.map((c) => (
            <label
              key={c}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${choice === c ? 'border-brand-blue bg-brand-tint' : 'border-line'}`}
            >
              <input
                type="radio"
                name="choice"
                value={c}
                checked={choice === c}
                onChange={() => setChoice(c)}
                className="h-5 w-5"
              />
              {c}
            </label>
          ))}
        </fieldset>
      )}

      {q.type === 'order_words' && (
        <div className="space-y-3">
          <div
            aria-label="Sua frase"
            className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-brand-blue p-2"
          >
            {picked.map((idx) => (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => setPicked((p) => p.filter((x) => x !== idx))}
                className="rounded-lg bg-brand-blue px-3 py-2 font-bold text-white"
                lang="fr"
              >
                {q.words?.[Number(idx)]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Palavras disponíveis">
            {q.words?.map((w, idx) =>
              picked.includes(`${idx}`) ? null : (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => setPicked((p) => [...p, `${idx}`])}
                  className="rounded-lg border border-brand-blue bg-white px-3 py-2 font-bold text-brand-blue"
                  lang="fr"
                >
                  {w}
                </button>
              ),
            )}
            {pool.length === 0 && (
              <span className="text-ink-muted">Todas as palavras foram usadas.</span>
            )}
          </div>
        </div>
      )}

      {q.type === 'match_pairs' && q.pairs && (
        <PairsBoard
          key={q.id}
          lefts={q.pairs.lefts}
          rights={q.pairs.rights}
          value={pairs}
          disabled={answered}
          onChange={setPairs}
        />
      )}

      {speech && (
        <div
          role="status"
          className="space-y-2 rounded-2xl border-2 border-brand-blue bg-brand-tint p-4"
        >
          <p className="font-bold text-brand-blue-dark">
            Foi compreendido: {speech.words.filter((w) => w.understood).length} de{' '}
            {speech.words.length} palavras.
          </p>
          <p lang="fr" className="flex flex-wrap gap-2 text-lg">
            {speech.words.map((w, idx) => (
              <span
                key={idx}
                className={`rounded-md px-2 py-0.5 font-bold ${w.understood ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-brand-red-text'}`}
              >
                <span aria-hidden="true">{w.understood ? '✓ ' : '✗ '}</span>
                {w.word}
                <span className="sr-only">
                  {w.understood ? ' (compreendida)' : ' (não compreendida)'}
                </span>
              </span>
            ))}
          </p>
          <p className="text-sm text-ink-soft">
            O que entendi: &ldquo;{speech.transcript || '(nada)'}&rdquo;. Isso mostra se a frase foi
            compreendida, não é nota de sotaque.
          </p>
        </div>
      )}

      {result && (
        <div ref={feedbackRef}>
          <Feedback result={result} />
        </div>
      )}
      {error && (
        <p role="alert" className="font-bold text-brand-red-text">
          <span aria-hidden="true">✗ </span>
          {error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex flex-wrap items-center gap-3 rounded-b-card border-t border-line bg-white/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {!answered && q.type !== 'speak' && !revealed && (
          <Button onClick={submit} disabled={!canSubmit || pending} className="min-w-36">
            {pending ? 'Corrigindo…' : 'Conferir'}
          </Button>
        )}
        {answered && (
          <Button onClick={next} className="min-w-36" autoFocus>
            {i + 1 < questions.length ? 'Continuar' : 'Ver resumo'}
          </Button>
        )}
        <Link href={backHref} className="inline-flex min-h-12 items-center px-2 text-sm">
          Parar por aqui
        </Link>
      </div>
    </ExerciseShell>
  );
}
