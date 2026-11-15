# Falando Francês Prática

Plataforma web de estudo para alunos das aulas particulares de francês. A professora atribui tarefa de casa, o aluno pratica (exercícios, flashcards, conjugação, ditado e fala) e ela vê a evolução e os pontos fracos antes da aula seguinte. O conteúdo vem do e-book Falando Francês (A1).

Stack: Next.js 15 (App Router), TypeScript estrito, Tailwind, Supabase (Auth, Postgres com RLS, Storage), zod, Vitest e Playwright.

## Requisitos

- Node 22 ou superior
- Docker (para o Supabase local)

## Rodar em desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run db:start                 # sobe o Supabase local e aplica as migrations (imprime as chaves)
# copie API URL, anon key e service_role key para o .env.local
npm run content:build            # opcional: regenera content/data/*.json a partir do e-book
npm run content:validate         # valida o conteúdo e imprime o relatório
npm run content:seed             # grava unidades, vocabulário e questões no banco (idempotente)
npm run db:seed-dev              # 1 professora, 2 alunos e histórico simulado
npm run audio:generate           # gera só os áudios que faltam (provider simulado sem chave)
npm run dev                      # http://localhost:3000
```

Logins de desenvolvimento (senha `senha-dev-123`): `professora@dev.local`, `ana@dev.local`, `bruno@dev.local`. Os e-mails do Supabase local chegam no Inbucket (http://127.0.0.1:54324).

Para o admin: `update profiles set role = 'admin' where email = '...'` no SQL Editor (o papel nunca é definido pelo cadastro).

## Testes

```bash
npm test                  # Vitest: correção, SRS, domínio, RLS (PGlite), conteúdo, fala, métricas, contraste
npm run typecheck
npm run lint
npm run check             # tudo acima mais a validação de conteúdo
npm run test:e2e          # Playwright
E2E_FLOW=1 npm run test:e2e   # inclui o fluxo completo (precisa do Supabase local e dos seeds)
```

- Os testes de RLS aplicam as migrations reais em PGlite (Postgres em WebAssembly), sem Docker.
- Se o Playwright não achar o navegador, use `PW_CHROMIUM_PATH=/caminho/do/chromium`.

## Conteúdo

- Fonte: `content/source/ebook-falando-frances-fonte.txt`
- Autoria: `scripts/content/*.ts`. O comando `npm run content:build` gera `content/data/*.json` (conjugações são lidas direto do texto-fonte).
- Pendências de revisão: `content/REVIEW.md`. Itens com `needs_review: true` não aparecem para o aluno, nem em exercícios, flashcards ou áudio.
- Novo nível (A2): adicione arquivos como `content/data/units.a2.json` e `questions.a2.json` com `"level": "A2"`. Nenhum código muda. Rode `content:validate` e `content:seed`.

## Publicar na VPS

O app, o HTTPS e os jobs rodam na VPS com docker compose. O banco, a autenticação e o Storage ficam no Supabase (recomendado: projeto na região São Paulo).

1. Crie o projeto no Supabase e aplique as migrations: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
2. Em Authentication, configure a URL do site e as URLs de redirecionamento (`https://SEU-DOMINIO/auth/callback`) e o SMTP.
3. Na VPS: clone o repositório, `cp .env.example .env` e preencha tudo (domínio, chaves do Supabase, `DATABASE_URL`, SMTP).
4. `docker compose --env-file .env up -d --build`. O Caddy emite o certificado HTTPS sozinho (aponte o DNS do domínio para a VPS antes).
5. Rode uma vez, de qualquer máquina com o `.env` de produção: `npm run content:seed` e `npm run audio:generate`.
6. Conceda acesso aos alunos pela página de cada aluno (acesso manual, com dias de validade).

Serviços do compose: `app` (Next.js), `caddy` (HTTPS), `jobs` (lembretes de tarefa às 09:00 e purga de gravações às 03:00, no fuso de São Paulo) e `backup`.

### Backup diário do banco

O serviço `backup` roda `pg_dump` todo dia às 03:00 (e uma vez ao subir) e guarda em `./backups/db-AAAAMMDD-HHMMSS.sql.gz`, mantendo 14 dias (`BACKUP_KEEP_DAYS`). Ele usa `DATABASE_URL` (conexão direta ao Postgres do Supabase).

- Copie `./backups` para fora da VPS (rclone, rsync ou snapshot do provedor). Backup na mesma máquina não protege contra perda da máquina.
- Restaurar: `gunzip -c backups/db-XXXX.sql.gz | psql "$DATABASE_URL"` em um banco vazio.
- Arquivos do Storage (áudios de referência) podem ser regenerados com `npm run audio:generate`. Gravações de voz expiram em 30 dias e não entram no backup de longo prazo por escolha de privacidade.
- Teste a restauração de tempos em tempos.

### Self-host do Supabase (alternativa)

Possível com o compose oficial do Supabase. Troque `NEXT_PUBLIC_SUPABASE_URL` e as chaves, aplique as migrations com `psql` e mantenha o backup apontando para o `DATABASE_URL` local. Dá mais trabalho de operação e atualização.

## Estrutura

Veja `CLAUDE.md` para comandos, convenções e mapa de pastas. Decisões e riscos: `DECISIONS.md`.
