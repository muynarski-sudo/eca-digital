# CLAUDE.md

Falando Francês Prática: área de membros para alunos de aulas particulares de francês (upsell do e-book Falando Francês, nível A1). Interface em português do Brasil. Nos textos da interface e na documentação não use travessões.

## Comandos

- `npm run dev:local`: roda o app sem Supabase (banco embutido PGlite em `.local-data`, usuários `professora@teste.local` e `aluno@teste.local`). `npm run local:reset` apaga os dados locais.
- `npm run dev` / `build` / `start`
- `npm run check`: typecheck, lint, validação de conteúdo e testes
- `npm test`: Vitest (inclui RLS em PGlite). `npm run test:e2e`: Playwright contra o app em modo local (`E2E_BASE_URL`, `E2E_NO_SERVER=1`, `PW_CHROMIUM_PATH`)
- `npm run content:build | content:validate | content:seed`
- `npm run db:start | db:reset | db:seed-dev`
- `npm run audio:generate`, `npm run jobs:reminders`, `npm run jobs:purge-recordings`
- Scripts que importam código do servidor rodam com `tsx --conditions=react-server` (por causa do pacote `server-only`).

## Convenções

- TypeScript estrito, sem `any`. ESLint (next) e Prettier (`npm run format`).
- Regras de negócio ficam em funções puras testadas em `src/lib/domain` (correção, SRS, domínio, plano diário, métricas). Telas só chamam essas funções.
- Cores só em `src/styles/tokens.css` e `tailwind.config.ts`. Mudou uma cor? Rode `tests/contrast.test.ts` (AA).
- Erro sempre com ícone e texto, nunca só cor. Pronúncia aportuguesada entre parênteses e em cinza.
- Segredos (service role, TTS, STT, IA) só no servidor. Nada com `NEXT_PUBLIC_` além da URL e da anon key do Supabase.
- Conteúdo de francês nunca é inventado: vem do e-book ou fica `source: "generated"`. Itens `needs_review: true` não vão para exercícios, flashcards nem áudio e precisam estar em `content/REVIEW.md`.
- Mudou o banco? Nova migration em `supabase/migrations` e teste em `tests/rls.test.ts`.

## Estrutura

- `content/source`: texto do e-book. `content/data`: JSON validado por zod. `content/REVIEW.md`: pendências.
- `scripts/content`: autoria do conteúdo (`generators.ts` gera o banco grande de exercícios a partir do e-book; `src/lib/content/french.ts` tem as regras de números e horas). `scripts/*.ts`: build, validação, seed, áudio, jobs.
- `src/lib/local`: modo local. `client.ts` imita o supabase-js sobre o PGlite (com a RLS real, cada consulta numa transação com `set local role`); `db.ts` abre o banco e faz o bootstrap; `session.ts` assina o cookie de sessão. Metadados (tipos de coluna) devem ser lidos ANTES de abrir a transação, senão o PGlite trava.
- `supabase/migrations`: esquema, RLS, cobrança, privilégios.
- `src/lib/domain`: grade, srs, mastery, select (sorteio sem repetição), plan (treino diário e de unidade), metrics. `src/lib/content`: schemas e carga. `src/lib/practice`: persistência das respostas.
`src/lib/speech`, `src/lib/audio`, `src/lib/notify`, `src/lib/conversation`: providers atrás de interfaces.
- `src/app/(app)`: aluno. `src/app/(staff)`: professora e admin. `src/app/(auth)`: login (não há autocadastro; a professora cadastra os alunos). `src/app/api`: áudio, fala, exportação, conversa.
- `src/components/ui`: Card, Button, ProgressRing, MasteryBadge, AudioButton, StreakChip, EmptyState, TricolorBar. `src/components/practice`: ExerciseShell, executor, flashcards, gravador.
- `artifact`: demo de página única (esbuild) com a lógica de `src/lib/domain` rodando no navegador; `./artifact/build.sh` gera `artifact/dist/*.html`.
- `docs`: app instalável (PWA offline) gerado por `./artifact/build-pwa.sh`; servido pelo GitHub Pages (pasta /docs). Não edite à mão.
- `deploy`: Caddyfile, backup e jobs. `Dockerfile` e `docker-compose.yml` na raiz.
