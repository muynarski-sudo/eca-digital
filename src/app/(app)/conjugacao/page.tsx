import { ExerciseRunner } from '@/components/practice/ExerciseRunner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { PERSON_LABELS, TENSE_LABELS } from '@/lib/content/conjugation';
import { conjugationId, conjugations, parseConjugationId } from '@/lib/content/static';
import { PERSONS, PRACTICE_TENSES, TENSES, type Tense } from '@/lib/content/schema';
import type { PublicQuestion } from '@/lib/practice/types';
import { requireStudent } from '@/lib/session';

export const metadata = { title: 'Conjugação' };

export default async function Conjugacao({
  searchParams,
}: {
  searchParams: Promise<{ verbo?: string; tempo?: string; modo?: string }>;
}) {
  await requireStudent();
  const sp = await searchParams;
  const verb = conjugations.find((c) => c.id === sp.verbo) ?? conjugations[0]!;
  const tense = (TENSES as readonly string[]).includes(sp.tempo ?? '')
    ? (sp.tempo as Tense)
    : 'present';
  const canPractice = (PRACTICE_TENSES as readonly string[]).includes(tense);
  const practicing = sp.modo === 'praticar' && canPractice;
  const blocked = sp.modo === 'praticar' && !canPractice;

  const questions: PublicQuestion[] = PERSONS.map((p) => {
    const item = parseConjugationId(conjugationId(verb.id, tense, p))!;
    return {
      id: item.id,
      unit: null,
      type: 'conjugate' as const,
      skill: 'gramatica' as const,
      prompt: `Conjugue ${item.verb} (${item.pt}) no ${TENSE_LABELS[tense]}: ${item.subject}_____`,
    };
  });

  return (
    <>
      <PageHeader
        title="Laboratório de conjugação"
        subtitle="17 verbos, direto das tabelas do e-book. Você pratica o présent; os outros tempos são para consultar."
      />
      <Card as="section" aria-label="Escolha o verbo e o tempo">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label htmlFor="verbo" className="mb-1 block font-bold">
              Verbo
            </label>
            <select id="verbo" name="verbo" defaultValue={verb.id} className="field">
              {conjugations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.verb} ({c.pt})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tempo" className="mb-1 block font-bold">
              Tempo
            </label>
            <select id="tempo" name="tempo" defaultValue={tense} className="field">
              {TENSES.map((t) => (
                <option key={t} value={t}>
                  {TENSE_LABELS[t]}
                  {(PRACTICE_TENSES as readonly string[]).includes(t) ? '' : ' (só consulta)'}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Ver tabela
          </Button>
          <Button type="submit" name="modo" value="praticar">
            Praticar
          </Button>
        </form>
      </Card>
      {blocked && (
        <p
          role="status"
          className="rounded-xl border-2 border-brand-blue bg-brand-tint p-3 font-bold text-brand-blue-dark"
        >
          <span aria-hidden="true">ℹ </span>
          Esse tempo ainda não é ensinado nos capítulos do e-book, então não tem exercício. Pratique
          o Présent.
        </p>
      )}
      {practicing ? (
        <ExerciseRunner
          questions={questions}
          title={`${verb.verb} · ${TENSE_LABELS[tense]}`}
          backHref={`/conjugacao?verbo=${verb.id}&tempo=${tense}`}
          backLabel="Voltar à tabela"
        />
      ) : (
        <Card as="section" aria-label="Tabela de conjugação">
          <h2 className="mb-3 text-xl">
            <span lang="fr">{verb.verb}</span> · {verb.pt} · {TENSE_LABELS[tense]}
          </h2>
          <table className="w-full text-left">
            <caption className="sr-only">
              Conjugação de {verb.verb} no {TENSE_LABELS[tense]}
            </caption>
            <thead>
              <tr>
                <th className="border-b border-line py-2 pr-4" scope="col">
                  Pessoa
                </th>
                <th className="border-b border-line py-2" scope="col">
                  Forma
                </th>
              </tr>
            </thead>
            <tbody>
              {PERSONS.map((p) => (
                <tr key={p}>
                  <th
                    scope="row"
                    className="border-b border-line py-2 pr-4 font-normal text-ink-muted"
                  >
                    {PERSON_LABELS[p]}
                  </th>
                  <td
                    lang="fr"
                    className="border-b border-line py-2 text-lg font-bold text-brand-blue-dark"
                  >
                    {verb.tenses[tense][p]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
