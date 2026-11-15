import { isLocalMode } from '@/lib/local/mode';

/** Prepara o banco embutido do modo local (migrations, conteúdo e usuários de teste) assim que o servidor sobe. */
export async function prepareLocal() {
  if (!isLocalMode()) return;
  const { localDb } = await import('@/lib/local/db');
  await localDb();
  console.warn(
    '[local] banco pronto. Usuários de teste: professora@teste.local / professora123 e aluno@teste.local / aluno123',
  );
}
