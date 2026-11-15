# DECISIONS.md

Registro de decisões técnicas do Falando Francês Prática. Cada decisão tem data, motivo e consequência.

## Plano (execução em fases, na ordem)

1. Fundação: Next.js, tokens de cor, contraste AA, qualidade (TS estrito, ESLint, Prettier, Vitest).
2. Parte 1: conteúdo estruturado (zod, 7 arquivos JSON, seed idempotente, relatório).
3. Parte 2: domínio puro (correção, SRS, domínio), migrations com RLS e testes de RLS, webhook Hotmart, telas do aluno e da professora.
4. Parte 3: áudio (TTS), fala (STT), ditado, tarefa de casa, lembretes, purga de gravações.
5. Parte 4: multi-nível, conversa guiada (desligada), métricas administrativas.
6. LGPD, deploy (docker compose, HTTPS, backup), README, CLAUDE.md, relatório final.

## Riscos conhecidos

- **Conteúdo de francês**: o e-book tem erros e inconsistências próprias (ver content/REVIEW.md). Nada foi corrigido em silêncio.
- **Ambiente de build sem Docker**: o Supabase local (Docker) não roda neste ambiente. Testes de RLS usam PGlite (Postgres em WebAssembly) com as migrations reais. O teste Playwright ponta a ponta exige Supabase local e não foi executado aqui (ver relatório).
- **Hotmart**: nomes de eventos e formato do payload precisam de conferência na documentação atual (seção própria abaixo).
- **LGPD**: menores de 18 anos e transferência internacional de dados dependem de validação do advogado responsável.

## Decisões

### D1. Fonte do conteúdo
O arquivo `content/source/ebook-falando-frances-fonte.txt` não existia no repositório. Por escolha do responsável, o texto foi extraído do documento Gamma "Untitled" (id ofcrqzzmprij988, atualizado em 2026-11-15), que contém introdução, 10 capítulos, tabelas de conjugação e gabarito. O HTML foi convertido em texto por script. A exportação perdeu o layout de algumas tabelas (por exemplo, quadros de possessivos), então o parsing foi feito à mão e conferido contra o texto.

### D2. Repositório
O repositório continha outro produto (ECA Escolar, Vite + Express + SQLite). Por escolha do responsável ("substituir a raiz"), o app antigo foi removido da raiz. Ele continua recuperável no histórico do git (commit c825479).

### D3. Stack
Next.js 15 (App Router), React 19, TypeScript estrito (`noUncheckedIndexedAccess`), Tailwind 3 (configuração em `tailwind.config.ts`, cores em `src/styles/tokens.css`), zod 4, Vitest, Playwright. Tailwind 3 em vez de 4 para manter a configuração explícita pedida.

### D4. Contraste AA (tokens de cor)
Os tokens pedidos foram mantidos para fundos, botões e anel. Dois pares não passam AA para texto pequeno sobre branco, então foram criadas variantes só para texto:

| Par | Razão | Resultado | Ajuste |
|---|---|---|---|
| #EF4135 sobre branco | 3,83 | falha (texto) | texto vermelho usa #C4281D (5,72). #EF4135 fica para fundos, ícones e selos |
| #2E9E5B sobre branco | 3,41 | falha (texto) | texto verde usa #1E7A42 (5,36). #2E9E5B fica para ícones |
| branco sobre #EF4135 | 3,83 | só texto grande | não usar texto pequeno branco sobre o vermelho da marca |
| #0055A4 sobre branco / azul claro | 7,41 / 6,51 | passa | sem ajuste |
| cinza de texto secundário | #5F6B7A: 5,5 (branco), 4,77 (azul claro) | passa | cinza escolhido para passar nos dois fundos |

Os pares são verificados por teste (`tests/contrast.test.ts`).
