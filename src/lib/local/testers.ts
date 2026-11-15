import type { DevUser } from '@/lib/dev/seed';

/** Usuários de teste do modo local (aparecem na tela de login só nesse modo). */
export const LOCAL_TESTERS: DevUser[] = [
  {
    email: 'professora@teste.local',
    name: 'Professora Teste',
    password: 'professora123',
    role: 'admin',
  },
  {
    email: 'aluno@teste.local',
    name: 'Aluno Teste',
    password: 'aluno123',
    role: 'student',
    consented: true,
    history: { units: ['u01', 'u02', 'u03'], days: 14, lastDaysAgo: 0, accuracy: 0.8, seed: 7 },
  },
];
