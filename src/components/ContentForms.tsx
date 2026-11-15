'use client';
import { ActionForm } from '@/components/FormParts';
import { saveQuestion, saveVocab, publishLegal } from '@/lib/actions/staff';

export function QuestionForm({
  q,
}: {
  q: {
    id: string;
    prompt: string;
    answers: string[];
    explanation: string;
    hint: string | null;
    needs_review: boolean;
  };
}) {
  return (
    <ActionForm action={saveQuestion} submitLabel="Salvar questão" hidden={{ id: q.id }}>
      <div>
        <label htmlFor={`p-${q.id}`} className="mb-1 block font-bold">
          Enunciado
        </label>
        <textarea
          id={`p-${q.id}`}
          name="prompt"
          defaultValue={q.prompt}
          rows={2}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`a-${q.id}`} className="mb-1 block font-bold">
          Respostas aceitas (uma por linha; a primeira é a oficial)
        </label>
        <textarea
          id={`a-${q.id}`}
          name="answers"
          defaultValue={q.answers.join('\n')}
          rows={3}
          className="field"
          lang="fr"
        />
      </div>
      <div>
        <label htmlFor={`e-${q.id}`} className="mb-1 block font-bold">
          Explicação
        </label>
        <textarea
          id={`e-${q.id}`}
          name="explanation"
          defaultValue={q.explanation}
          rows={2}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`h-${q.id}`} className="mb-1 block font-bold">
          Dica
        </label>
        <input id={`h-${q.id}`} name="hint" defaultValue={q.hint ?? ''} className="field" />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="needs_review"
          defaultChecked={q.needs_review}
          className="h-5 w-5"
        />{' '}
        Pendente de revisão (esconde do aluno)
      </label>
    </ActionForm>
  );
}

export function VocabForm({
  v,
}: {
  v: { id: string; fr: string; pt: string; pron: string | null; needs_review: boolean };
}) {
  return (
    <ActionForm action={saveVocab} submitLabel="Salvar item" hidden={{ id: v.id }}>
      <div>
        <label htmlFor={`fr-${v.id}`} className="mb-1 block font-bold">
          Francês
        </label>
        <input id={`fr-${v.id}`} name="fr" defaultValue={v.fr} className="field" lang="fr" />
      </div>
      <div>
        <label htmlFor={`pt-${v.id}`} className="mb-1 block font-bold">
          Português
        </label>
        <input id={`pt-${v.id}`} name="pt" defaultValue={v.pt} className="field" />
      </div>
      <div>
        <label htmlFor={`pr-${v.id}`} className="mb-1 block font-bold">
          Pronúncia aportuguesada
        </label>
        <input id={`pr-${v.id}`} name="pron" defaultValue={v.pron ?? ''} className="field" />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="needs_review"
          defaultChecked={v.needs_review}
          className="h-5 w-5"
        />{' '}
        Pendente de revisão (esconde do aluno)
      </label>
    </ActionForm>
  );
}

export function LegalForm({
  kind,
  title,
  body,
}: {
  kind: 'privacy' | 'terms';
  title: string;
  body: string;
}) {
  return (
    <ActionForm action={publishLegal} submitLabel="Publicar nova versão" hidden={{ kind }}>
      <div>
        <label htmlFor={`t-${kind}`} className="mb-1 block font-bold">
          Título
        </label>
        <input id={`t-${kind}`} name="title" defaultValue={title} className="field" />
      </div>
      <div>
        <label htmlFor={`b-${kind}`} className="mb-1 block font-bold">
          Texto (Markdown simples)
        </label>
        <textarea
          id={`b-${kind}`}
          name="body"
          defaultValue={body}
          rows={16}
          className="field font-mono text-sm"
        />
      </div>
    </ActionForm>
  );
}
