/* Seed de desenvolvimento no Supabase: 1 professora, 2 alunos e histórico simulado. NUNCA rode em produção.
   Uso: npm run db:seed-dev (depois de npm run content:seed). No modo local o app já cria os usuários de teste sozinho. */
import { seedDev, type DevUser } from '../src/lib/dev/seed';
import { serviceClient } from './lib/env';

const PASSWORD = 'senha-dev-123';
const USERS: DevUser[] = [
  { email: 'professora@dev.local', name: 'Professora Dev', password: PASSWORD, role: 'teacher' },
  {
    email: 'ana@dev.local',
    name: 'Ana Aluna',
    password: PASSWORD,
    role: 'student',
    consented: true,
    history: { units: ['u01', 'u02', 'u03'], days: 21, lastDaysAgo: 0, accuracy: 0.88, seed: 7 },
  },
  {
    email: 'bruno@dev.local',
    name: 'Bruno Aluno',
    password: PASSWORD,
    role: 'student',
    consented: true,
    history: { units: ['u01', 'u04', 'u08'], days: 25, lastDaysAgo: 9, accuracy: 0.55, seed: 11 },
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed-dev não roda em produção');
  await seedDev(serviceClient(), USERS, (m) => console.warn(m));
  console.warn(
    `Pronto. Logins de desenvolvimento (senha ${PASSWORD}): ${USERS.map((u) => u.email).join(', ')}`,
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
