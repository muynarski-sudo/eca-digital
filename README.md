# Falando Francês Prática

Plataforma web de estudo para alunos das aulas particulares de francês. A professora atribui tarefa de casa, o aluno pratica (exercícios, flashcards, conjugação, ditado e fala) e ela vê a evolução e os pontos fracos antes da aula seguinte. O conteúdo vem do e-book Falando Francês (A1).

Stack: Next.js 15 (App Router), TypeScript estrito, Tailwind, Supabase (Auth, Postgres com RLS, Storage), zod, Vitest e Playwright.

## Rodar localmente (sem Supabase, sem Docker)

```bash
npm install
npm run dev:local        # http://localhost:3000
```

Na primeira vez o app prepara sozinho um banco embutido (PGlite, com as migrations e a RLS reais), carrega o conteúdo do e-book e cria dois usuários de teste. Os dados ficam em `.local-data/` (ignorado pelo git).

| Papel | E-mail | Senha |
|---|---|---|
| Professora (admin, vê tudo) | `professora@teste.local` | `professora123` |
| Aluno | `aluno@teste.local` | `aluno123` |

O aluno de teste já vem com histórico simulado de 14 dias. Para recomeçar do zero: pare o servidor e rode `npm run local:reset`.

Como funciona o acesso (por enquanto, só alunos do seu círculo):

- Não existe autocadastro. A professora cadastra o aluno em **Cadastrar aluno** (nome, e-mail e a senha que ela gera; há um botão "Gerar") e passa os dados a ele.
- No primeiro acesso o aluno aceita a Política de Privacidade, o Termo de Uso e o aviso de maioridade.
- Na página de cada aluno a professora pode pausar ou liberar o acesso, definir uma nova senha, conceder ou encerrar acesso por prazo e **descadastrar** (apaga a conta e todos os dados do aluno).
- Esqueceu a senha? O aluno pede à professora, que define outra.
- Pagamento (Hotmart, Pix, cartão) fica para uma versão futura.

Limites do modo local: sem envio de e-mail, sem provedores reais de voz e IA (usa os simulados; o áudio de referência usa a voz do navegador), um processo por vez no banco (não rode seeds com o servidor ligado).

## Rodar com Supabase (produção ou desenvolvimento com Docker)

Requisitos: Node 22 e Docker.

```bash
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e as chaves; isso desliga o modo local
npm run db:start             # sobe o Supabase local e aplica as migrations (imprime as chaves)
npm run content:validate && npm run content:seed
npm run db:seed-dev          # opcional: professora, 2 alunos e histórico simulado
npm run audio:generate       # opcional: gera os áudios que faltam (provider simulado sem chave)
npm run dev
```

Para o admin no Supabase: `update profiles set role = 'admin' where email = '...'` (o papel nunca é definido pelo cadastro). Os alunos são cadastrados pela professora na tela, como no modo local.

## Testes

```bash
npm test                  # Vitest: correção, SRS, domínio, RLS (PGlite), conteúdo, fala, métricas, contraste
npm run typecheck
npm run lint
npm run check             # tudo acima mais a validação de conteúdo
npm run dev:local &       # o e2e usa o app em modo local
npm run test:e2e          # Playwright: login, exercícios, flashcards, professora, cadastrar/descadastrar aluno, pausar acesso
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
2. Em Authentication, desligue o cadastro público ("Allow new users to sign up") e configure o SMTP.
3. Na VPS: clone o repositório, `cp .env.example .env` e preencha tudo (domínio, chaves do Supabase, `DATABASE_URL`, SMTP). Com `NEXT_PUBLIC_SUPABASE_URL` preenchido o app não usa o modo local.
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
