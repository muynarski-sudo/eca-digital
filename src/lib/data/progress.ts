import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Unit } from '@/lib/content/schema';
import {
  decayed,
  levelProgress,
  localDay,
  studyStreak,
  unitMastery,
  unitStates,
  type UnitState,
} from '@/lib/domain/mastery';
import { mapUnit } from './content';

export interface UnitView {
  unit: Unit;
  mastery: number;
  state: UnitState;
  questionCount: number;
  practiced: number;
}

export interface Progress {
  units: UnitView[];
  level: number;
  skills: Record<'vocabulario' | 'gramatica' | 'escuta' | 'fala', number>;
  streak: number;
  dueQuestionIds: string[];
  itemMastery: Record<string, { mastery: number; lastPracticed: Date | null }>;
  lastActivity: Date | null;
}

/** Calcula o progresso de um aluno a partir das tabelas (domínio com decaimento aplicado na hora). Serve ao aluno e à professora (via RLS). */
export async function loadProgress(
  db: SupabaseClient,
  studentId: string,
  level = 'A1',
  now = new Date(),
): Promise<Progress> {
  const since = new Date(now.getTime() - 400 * 86_400_000).toISOString();
  const [u, q, im, un, sk, at, due] = await Promise.all([
    db.from('units').select('*').eq('level', level).order('ord'),
    db
      .from('questions')
      .select('id,unit_id,difficulty')
      .eq('active', true)
      .eq('needs_review', false)
      .not('unit_id', 'is', null),
    db.from('item_mastery').select('item_id,mastery,last_practiced_at').eq('student_id', studentId),
    db.from('unit_unlocks').select('unit_id').eq('student_id', studentId),
    db.from('skill_scores').select('skill,score').eq('student_id', studentId),
    db
      .from('attempts')
      .select('created_at')
      .eq('student_id', studentId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000),
    db
      .from('srs_cards')
      .select('item_id')
      .eq('student_id', studentId)
      .eq('item_kind', 'question')
      .lte('due_at', now.toISOString())
      .order('due_at')
      .limit(60),
  ]);
  const itemMastery: Progress['itemMastery'] = {};
  for (const r of im.data ?? [])
    itemMastery[r.item_id as string] = {
      mastery: Number(r.mastery),
      lastPracticed: r.last_practiced_at ? new Date(r.last_practiced_at as string) : null,
    };
  const unlocked = new Set((un.data ?? []).map((r) => r.unit_id as string));
  const units = (u.data ?? []).map(mapUnit);

  const snaps = units.map((unit) => {
    const items = (q.data ?? []).filter((x) => x.unit_id === unit.id);
    const mastery = unitMastery(
      items.map((i) => {
        const m = itemMastery[i.id as string];
        return {
          weight: i.difficulty as number,
          mastery: m ? decayed(m.mastery, m.lastPracticed, now) : 0,
        };
      }),
    );
    return { unit, items, mastery };
  });
  const states = unitStates(
    snaps.map((s) => ({
      id: s.unit.id,
      order: s.unit.order,
      mastery: s.mastery,
      manuallyUnlocked: unlocked.has(s.unit.id),
    })),
  );
  const views: UnitView[] = snaps.map((s) => ({
    unit: s.unit,
    mastery: s.mastery,
    state: states[s.unit.id] ?? 'locked',
    questionCount: s.items.length,
    practiced: s.items.filter((i) => itemMastery[i.id as string]).length,
  }));
  const skills = { vocabulario: 0, gramatica: 0, escuta: 0, fala: 0 };
  for (const r of sk.data ?? []) skills[r.skill as keyof typeof skills] = Number(r.score);
  const days = [...new Set((at.data ?? []).map((r) => localDay(new Date(r.created_at as string))))];
  const first = at.data?.[0]?.created_at as string | undefined;
  return {
    units: views,
    level: levelProgress(views),
    skills,
    streak: studyStreak(days, localDay(now)),
    dueQuestionIds: (due.data ?? []).map((r) => r.item_id as string),
    itemMastery,
    lastActivity: first ? new Date(first) : null,
  };
}
