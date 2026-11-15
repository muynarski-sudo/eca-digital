'use client';
import { useState } from 'react';
import { ActionForm } from '@/components/FormParts';
import { Button } from '@/components/ui/Button';
import { registerStudent } from '@/lib/actions/staff';

/** Palavras fáceis de ditar. A geração acontece no navegador só para sugerir; a senha é a que estiver no campo. */
function suggest(): string {
  const words = [
    'sol',
    'lua',
    'mar',
    'rio',
    'pao',
    'vinho',
    'queijo',
    'cafe',
    'paris',
    'lyon',
    'nice',
    'rosa',
    'azul',
    'bleu',
    'rouge',
    'blanc',
  ];
  const r = new Uint32Array(3);
  crypto.getRandomValues(r);
  return `${words[r[0]! % words.length]}-${words[r[1]! % words.length]}-${1000 + (r[2]! % 9000)}`;
}

export function RegisterStudentForm() {
  const [pwd, setPwd] = useState('');
  return (
    <ActionForm action={registerStudent} submitLabel="Cadastrar aluno">
      <div>
        <label htmlFor="name" className="mb-1 block font-bold">
          Nome do aluno
        </label>
        <input id="name" name="name" required className="field" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block font-bold">
          E-mail (será o login)
        </label>
        <input id="email" name="email" type="email" required className="field" autoComplete="off" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block font-bold">
          Senha
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            name="password"
            required
            minLength={8}
            className="field"
            autoComplete="off"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            aria-describedby="pwd-hint"
          />
          <Button type="button" variant="secondary" onClick={() => setPwd(suggest())}>
            Gerar
          </Button>
        </div>
        <p id="pwd-hint" className="mt-1 text-sm text-ink-muted">
          Mínimo de 8 caracteres. Anote: depois de cadastrar, a senha não aparece de novo.
        </p>
      </div>
      <div>
        <label htmlFor="days" className="mb-1 block font-bold">
          Dias de acesso (opcional)
        </label>
        <input id="days" name="days" type="number" min={1} max={3650} className="field max-w-40" />
        <p className="mt-1 text-sm text-ink-muted">
          Em branco = sem data final. Você pode pausar ou descadastrar quando quiser.
        </p>
      </div>
    </ActionForm>
  );
}
