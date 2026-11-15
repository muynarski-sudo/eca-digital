'use client';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { FormState } from '@/lib/actions/auth';

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  hint,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block font-bold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="field"
        aria-describedby={hint ? `${name}-hint` : undefined}
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Senha com botão para mostrar/ocultar (ajuda a digitar no celular). */
export function PasswordField({
  label = 'Senha',
  name = 'password',
  autoComplete = 'current-password',
  hint,
}: {
  label?: string;
  name?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="mb-1 block font-bold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={name}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="field"
          aria-describedby={hint ? `${name}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          className="shrink-0 rounded-xl border-2 border-line px-3 font-bold"
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function CheckField({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} required className="mt-1 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </label>
  );
}

export function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border-2 border-brand-red-text bg-danger-bg p-3 font-bold text-brand-red-text"
        >
          <span aria-hidden="true">✗ </span>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p
          role="status"
          className="rounded-xl border-2 border-success bg-success-bg p-3 font-bold text-success-text"
        >
          <span aria-hidden="true">✓ </span>
          {state.ok}
        </p>
      )}
    </>
  );
}

/** Formulário com server action e mensagens acessíveis. */
export function ActionForm({
  action,
  submitLabel,
  children,
  hidden,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4" noValidate={false}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <Messages state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Aguarde…' : submitLabel}
      </Button>
    </form>
  );
}
