/* Seed idempotente do conteúdo no banco (Supabase). Uso: npm run content:seed [-- --no-overwrite]
   No modo local o app já faz isso sozinho ao iniciar. */
import { seedContent } from '../src/lib/content/seed';
import { serviceClient } from './lib/env';
import { validate } from './content-validate';

async function main() {
  const { errors } = validate();
  if (errors.length) {
    console.error(`Conteúdo inválido:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  await seedContent(serviceClient(), {
    noOverwrite: process.argv.includes('--no-overwrite'),
    log: (m) => console.warn(m),
  });
  console.warn('Seed de conteúdo concluído.');
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
