import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { STAGES } from '@/lib/content/stages';
import { stageViews, type StageView } from '@/lib/domain/stages';
import type { QuestionMeta, SeenInfo } from '@/lib/domain/select';
import { getQuestionMeta } from './content';
import { loadSeen } from './seen';

export interface StageData {
  views: StageView[];
  meta: QuestionMeta[];
  seen: Map<string, SeenInfo>;
}

/** Níveis da trilha com pontuação e bloqueio. Professora e administradora enxergam tudo aberto; a liberação de capítulo vale para o aluno. */
export async function loadStageData(
  db: SupabaseClient,
  studentId: string,
  role: 'student' | 'teacher' | 'admin',
): Promise<StageData> {
  const [meta, seen, un] = await Promise.all([
    getQuestionMeta(db),
    loadSeen(db, studentId),
    db.from('unit_unlocks').select('unit_id').eq('student_id', studentId),
  ]);
  const unlockedUnits = new Set(
    ((un.data ?? []) as Array<{ unit_id: string }>).map((r) => r.unit_id),
  );
  return {
    views: stageViews(STAGES, meta, seen.seen, { unlockedUnits, openAll: role !== 'student' }),
    meta,
    seen: seen.seen,
  };
}
