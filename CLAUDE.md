# CLAUDE.md

Falando Francês Prática: área de membros para alunos de aulas particulares de francês (upsell do e-book Falando Francês, nível A1). Interface em português do Brasil. Nos textos da interface e na documentação não use travessões.

## Comandos

- `npm run dev` / `build` / `start`
- `npm run check`: typecheck, lint, validação de conteúdo e testes
- `npm test`: Vitest (inclui RLS em PGlite). `npm run test:e2e`: Playwright (`E2E_FLOW=1` para o fluxo completo)
- `npm run content:build | content:validate | content:seed`
- `npm run db:start | db:reset | db:seed-dev`
- `npm run audio:generate`, `npm run jobs:reminders`, `npm run jobs:purge-recordings`
- Scripts que importam código do servidor rodam com `tsx --conditions=react-server` (por causa do pacote `server-only`).

## Convenções

- TypeScript estrito, sem `any`. ESLint (next) e Prettier (`npm run format`).
- Regras de negócio ficam em funções puras testadas em `src/lib/domain` (correção, SRS, domínio, plano diário, métricas). Telas só chamam essas funções.
- Cores só em `src/styles/tokens.css` e `tailwind.config.ts`. Mudou uma cor? Rode `tests/contrast.test.ts` (AA).
- Erro sempre com ícone e texto, nunca só cor. Pronúncia aportuguesada entre parênteses e em cinza.
- Segredos (service role, TTS, STT, IA, hottok) só no servidor. Nada com `NEXT_PUBLIC_` além da URL e da anon key do Supabase.
- Conteúdo de francês nunca é inventado: vem do e-book ou fica `source: "generated"`. Itens `needs_review: true` não vão para exercícios, flashcards nem áudio e precisam estar em `content/REVIEW.md`.
- Mudou o banco? Nova migration em `supabase/migrations` e teste em `tests/rls.test.ts`.

## Estrutura

- `content/source`: texto do e-book. `content/data`: JSON validado por zod. `content/REVIEW.md`: pendências.
- `scripts/content`: autoria do conteúdo. `scripts/*.ts`: build, validação, seed, áudio, jobs.
- `supabase/migrations`: esquema, RLS, cobrança, privilégios.
- `src/lib/domain`: grade, srs, mastery, plan, metrics. `src/lib/content`: schemas e carga. `src/lib/practice`: persistência das respostas.
- `src/lib/billing`: webhook Hotmart (parse, token, processamento idempotente). `src/lib/speech`, `src/lib/audio`, `src/lib/notify`, `src/lib/conversation`: providers atrás de interfaces.
- `src/app/(app)`: aluno. `src/app/(staff)`: professora e admin. `src/app/(auth)`: login e cadastro. `src/app/api`: webhook, áudio, fala, exportação, conversa.
- `src/components/ui`: Card, Button, ProgressRing, MasteryBadge, AudioButton, StreakChip, EmptyState, TricolorBar. `src/components/practice`: ExerciseShell, executor, flashcards, gravador.
- `deploy`: Caddyfile, backup e jobs. `Dockerfile` e `docker-compose.yml` na raiz.
