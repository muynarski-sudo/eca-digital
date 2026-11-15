'use client';
import { ActionForm } from '@/components/FormParts';
import { gradeAssignment } from '@/lib/actions/staff';

export function GradeForm({ id, grade, feedback }: { id: string; grade: number | null; feedback: string | null }) {
  return (
    <ActionForm action={gradeAssignment} submitLabel="Salvar feedback" hidden={{ id }}>
      <div>
        <label htmlFor={`g-${id}`} className="mb-1 block font-bold">Nota (0 a 10)</label>
        <input id={`g-${id}`} name="grade" type="number" min={0} max={10} step={0.5} defaultValue={grade ?? ''} className="field max-w-32" />
      </div>
      <div>
        <label htmlFor={`f-${id}`} className="mb-1 block font-bold">Feedback para o aluno</label>
        <textarea id={`f-${id}`} name="feedback" rows={3} defaultValue={feedback ?? ''} className="field" maxLength={2000} />
      </div>
    </ActionForm>
  );
}
