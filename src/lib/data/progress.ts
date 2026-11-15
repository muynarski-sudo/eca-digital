import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Unit } from '@/lib/content/schema';
import {
  coverageFor,
  decayed,
  levelProgress,
  localDay,
  studyStreak,
  unitMastery,
  unitStates,
  type UnitState,
} from '@/lib/domain/mastery';
import { getQuestionMeta, mapUnit } from './content';

export interface UnitView {
  unit: Unit;
  mastery: number;
  state: UnitState;
  /** quantos pontos de conteúdo (conceitos) a unidade tem */
  questionCount: number;
  /** quantos deles o aluno já praticou */
  practiced: number;
}

export interface Progress {
  units: UnitView[];
  level: number;
  skills: Record<'vocabulario' | 'gramatica' | 'escuta' | 'fala', number>;
  streak: number;
  /** Quantos conceitos o aluno errou na última vez e ainda não reforçou. */
  weakConcepts: number;
  /** Domínio por conceito (chave = concept). */
  itemMastery: Record<string, { mastery: number; lastPracticed: Date | null }>;
  lastActivity: Date | null;
}

/** Calcula o progresso de um aluno (domínio com decaimento aplicado na hora). Serve ao aluno e à professora (via RLS). */
export async function loadProgress(
  db: SupabaseClient,
  studentId: string,
  level = 'A1',
  now = new Date(),
): Promise<Progress> {
  const since = new Date(now.getTime() - 400 * 86_400_000).toISOString();
  const [u, meta, im, un, sk, at] = await Promise.all([
    db.from('units').select('*').eq('level', level).order('ord'),
    getQuestionMeta(db),
    db
      .from('item_mastery')
      .select('item_id,mastery,last_practiced_at')
      .eq('student_id', studentId)
      .limit(20000),
    db.from('unit_unlocks').select('unit_id').eq('student_id', studentId),
    db.from('skill_scores').select('skill,score').eq('student_id', studentId),
    db
      .from('attempts')
      .select('created_at,verdict,concept')
      .eq('student_id', studentId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000),
  ]);
  const itemMastery: Progress['itemMastery'] = {};
  for (const r of im.data ?? []) {
    itemMastery[r.item_id as string] = {
      mastery: Number(r.mastery),
      lastPracticed: r.last_practiced_at ? new Date(r.last_practiced_at as string) : null,
    };
  }
  const unlocked = new Set((un.data ?? []).map((r) => r.unit_id as string));
  const units = (u.data ?? []).map(mapUnit);

  // conceitos de cada unidade, com o peso (dificuldade) da primeira questão do conceito
  const conceptsByUnit = new Map<string, Map<string, number>>();
  for (const q of meta) {
    if (!q.unit) continue;
    const m = conceptsByUnit.get(q.unit) ?? new Map<string, number>();
    if (!m.has(q.concept)) m.set(q.concept, q.difficulty);
    conceptsByUnit.set(q.unit, m);
  }

  const snaps = units.map((unit) => {
    const concepts = conceptsByUnit.get(unit.id) ?? new Map<string, number>();
    const practiced = [...concepts.entries()]
      .filter(([c]) => itemMastery[c])
      .map(([c, weight]) => {
        const m = itemMastery[c]!;
        return { weight, mastery: decayed(m.mastery, m.lastPracticed, now) };
      });
    return {
      unit,
      total: concepts.size,
      practiced,
      mastery: unitMastery(practiced, coverageFor(concepts.size)),
    };
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
    questionCount: s.total,
    practiced: s.practiced.length,
  }));

  const skills = { vocabulario: 0, gramatica: 0, escuta: 0, fala: 0 };
  for (const r of sk.data ?? []) skills[r.skill as keyof typeof skills] = Number(r.score);

  const rows = (at.data ?? []) as Array<{
    created_at: string;
    verdict: string;
    concept: string | null;
  }>;
  const days = [...new Set(rows.map((r) => localDay(new Date(r.created_at))))];
  const lastByConcept = new Map<string, string>();
  for (const r of rows)
    if (r.concept && !lastByConcept.has(r.concept)) lastByConcept.set(r.concept, r.verdict);
  const weakConcepts = [...lastByConcept.values()].filter((v) => v !== 'correct').length;

  return {
    units: views,
    level: levelProgress(views),
    skills,
    streak: studyStreak(days, localDay(now)),
    weakConcepts,
    itemMastery,
    lastActivity: rows[0] ? new Date(rows[0].created_at) : null,
  };
}
