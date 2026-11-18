'use client';
import { useState } from 'react';

/** Ligar pares por toque: toque numa palavra e depois na tradução. Cada par ganha o mesmo número. Toque de novo para desfazer. */
export function PairsBoard({
  lefts,
  rights,
  value,
  disabled,
  onChange,
}: {
  lefts: string[];
  rights: string[];
  value: Record<string, string>;
  disabled: boolean;
  onChange: (v: Record<string, string>) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const numberOfLeft = (l: string) => (value[l] ? lefts.indexOf(l) + 1 : 0);
  const leftOfRight = (r: string) => lefts.find((l) => value[l] === r);

  const tapLeft = (l: string) => {
    if (disabled) return;
    if (value[l]) {
      const { [l]: _removed, ...rest } = value;
      void _removed;
      onChange(rest);
      return setActive(null);
    }
    setActive(active === l ? null : l);
  };
  const tapRight = (r: string) => {
    if (disabled) return;
    const owner = leftOfRight(r);
    if (owner) {
      const { [owner]: _removed, ...rest } = value;
      void _removed;
      return onChange(rest);
    }
    if (!active) return;
    onChange({ ...value, [active]: r });
    setActive(null);
  };

  const cell = (on: boolean, picked: boolean) =>
    `flex min-h-14 w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-bold ${
      on
        ? 'border-brand-blue bg-brand-tint text-brand-blue-dark'
        : picked
          ? 'border-success bg-success-bg text-ink'
          : 'border-line bg-white text-ink'
    } disabled:opacity-70`;
  const badge = (n: number) => (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs text-white"
    >
      {n}
    </span>
  );

  const done = Object.keys(value).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft" role="status">
        {active
          ? 'Agora toque na tradução certa.'
          : done === lefts.length
            ? 'Todos ligados. Toque num par para desfazer.'
            : 'Toque numa palavra e depois na tradução.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div role="group" aria-label="Palavras em francês" className="space-y-2">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              lang="fr"
              disabled={disabled}
              aria-pressed={active === l || !!value[l]}
              onClick={() => tapLeft(l)}
              className={cell(active === l, !!value[l])}
            >
              {value[l] ? badge(numberOfLeft(l)) : null}
              {l}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Traduções" className="space-y-2">
          {rights.map((r) => {
            const owner = leftOfRight(r);
            return (
              <button
                key={r}
                type="button"
                disabled={disabled}
                aria-pressed={!!owner}
                onClick={() => tapRight(r)}
                className={cell(false, !!owner)}
              >
                {owner ? badge(lefts.indexOf(owner) + 1) : null}
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
