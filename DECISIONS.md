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

### D5. Hotmart: eventos e payload NÃO confirmados na documentação oficial
A tarefa pedia confirmar os nomes dos eventos e o formato do payload na documentação atual da Hotmart. Isso **não foi possível**: o host `developers.hotmart.com` está fora da rede permitida deste ambiente, e a liberação do host foi recusada. A busca na web só trouxe fontes de terceiros (Zapier, n8n, Voxuy, Stract), sem a documentação oficial.

O que foi implementado vem de (a) integrações de terceiros e (b) conhecimento prévio do formato da versão 2.0.0, e **precisa de conferência** com um webhook de teste enviado pelo painel da Hotmart antes de ir para produção:

- Token: cabeçalho `X-HOTMART-HOTTOK` (citado por integrações de terceiros); como reserva, campo `hottok` no corpo. Comparação em tempo constante (SHA-256 dos dois lados e `timingSafeEqual`). Token inválido gera 401 e não toca no banco.
- Eventos tratados (`src/lib/billing/hotmart.ts`, tabela `EVENT_ACTIONS`): `PURCHASE_APPROVED` e `PURCHASE_COMPLETE` (ativa), `PURCHASE_CANCELED` e `SUBSCRIPTION_CANCELLATION` (cancela), `PURCHASE_REFUNDED` (reembolso), `PURCHASE_CHARGEBACK` (chargeback), `PURCHASE_DELAYED` e `PURCHASE_EXPIRED` (atraso). Qualquer outro evento é registrado e ignorado.
- Campos lidos: `id`, `event`, `creation_date`, `data.buyer.email` (ou `data.subscriber.email`), `data.purchase.transaction`, `data.purchase.approved_date`. Se algum nome estiver diferente, só o schema em `hotmart.ts` muda.
- Idempotência: tabela `webhook_events` com chave única (provider, id do evento; sem id, hash do corpo). Evento que falhou volta a ser processável no reenvio. Eventos mais antigos que o último aplicado à mesma transação não desfazem o estado.
- Regra de acesso: ativa dentro da validade; cancelada mantém o período já pago; reembolso, chargeback e atraso bloqueiam na hora. Cada aprovação concede 32 dias (`HOTMART_PERIOD_DAYS`).
- Comprador sem conta: o acesso fica em `pending_grants` e vira assinatura no cadastro (por e-mail). Convite automático por e-mail é opcional (`HOTMART_AUTO_INVITE=true`).
- Pendência: confirmar também a política de reenvio (tentativas e código HTTP esperado). A rota responde 200 para processado, duplicado e ignorado, e 500 quando falha (para provocar novo envio).

### D6. Testes de RLS com PGlite
Sem Docker, os testes de RLS (`tests/rls.test.ts`) aplicam as migrations reais em PGlite (Postgres em WebAssembly), com um shim mínimo de `auth.users`, `auth.uid()` e dos papéis `anon`/`authenticated`. Cobertura: aluno não lê nem escreve dados de outro, professora vê só alunos vinculados, admin vê tudo, anônimo não lê nada, gatilhos de proteção de colunas, acesso por assinatura. Limitação: não cobre o Storage nem o GoTrue reais; rode o mesmo cenário contra `supabase start` quando tiver Docker.

### D7. Modelo de acesso e escrita
- O aluno escreve os próprios dados derivados (`srs_cards`, `item_mastery`, `unit_progress`, `skill_scores`), como pedido. Ele poderia, em tese, adulterar o próprio progresso por chamada direta à API. Mitigação: `attempts` é imutável para o aluno e é a fonte que a professora vê. Se isso virar problema, mover as escritas para uma função SECURITY DEFINER ou para o servidor.
- Liberação manual de unidade fica em `unit_unlocks` (só a professora grava), para o aluno não conseguir se liberar.
- Papéis `teacher` e `admin` nunca nascem no cadastro; são atribuídos pelo admin com service role (ou por SQL no seed).
- Conteúdo com `needs_review` fica invisível ao aluno também no banco (RLS), além de ser filtrado no app.
- A professora não ouve gravações de voz (minimização). Ela vê a transcrição e o resultado nas tentativas.

### D8. Calibragem do domínio (risco)
Com alfa 0,3 partindo de 0, são necessários cerca de 4 acertos por item para chegar a 70% naquele item, e a unidade tem de 17 a 41 questões. Isso é fiel à especificação, mas pode ser lento para liberar a unidade seguinte. Todas as constantes estão em `src/lib/domain/mastery.ts` (alfa, carência de 7 dias, meia-vida de 30 dias, 70% para abrir, 90% para "dominada"), e a professora pode liberar manualmente. Recomendo calibrar depois de algumas semanas de uso real.

### D9. Transferência internacional de dados (LGPD)
Cada provedor abaixo só recebe dados se for ativado. Todos estão desligados ou simulados por padrão. A professora/escola precisa firmar o contrato ou aceitar os termos de cada um, e o advogado responsável deve validar a base legal e atualizar a Política de Privacidade.

| Provedor | O que recebe | Quando | Observação |
|---|---|---|---|
| Supabase (banco, Auth, Storage) | todos os dados da plataforma | sempre | Escolher a região São Paulo (sa-east-1) mantém os dados no Brasil |
| Hotmart | e-mail do comprador (já é dado da Hotmart) | webhook de entrada | só recebemos; não enviamos dados à Hotmart |
| TTS (`TTS_PROVIDER=openai`) | apenas textos em francês do e-book | ao rodar `audio:generate` | sem dado pessoal; EUA no caso da OpenAI |
| STT (`STT_PROVIDER=openai`) | áudio da voz do aluno | a cada tentativa de fala | dado pessoal (voz). Não guardamos o áudio, salvo opção do aluno (30 dias). EUA no caso da OpenAI |
| IA de conversa (`AI_CONVERSATION_ENABLED=true`) | texto digitado pelo aluno na cena | a cada mensagem | desligada por padrão; nada é gravado no nosso banco; EUA no caso da Anthropic |
| SMTP (lembretes) | e-mail e nome do aluno, título da tarefa | job diário | depende do provedor escolhido |

Sem chave configurada, TTS e STT usam providers simulados e nada sai do servidor.

### D10. Privacidade e minimização
- Sem rastreadores de terceiros, pixels ou fontes externas (Arial do sistema). Cabeçalhos de segurança no `next.config.mjs` (microfone só no próprio site).
- Consentimentos versionados em `consents` (privacy, terms, age_notice), registrados com a versão dos textos em `legal_documents`. Não guardamos IP nem agente de usuário.
- Textos de política e termo são modelos editáveis no painel do admin (cada publicação cria uma versão). O aviso de maioridade (18 anos ou autorização do responsável) está no cadastro, **a validar pelo advogado responsável**.
- Gravação de voz é opt-in (caixa "guardar por 30 dias"). Purga diária (`jobs:purge-recordings`) e exclusão pelo aluno em "Meus dados".
- Exportação em JSON (`/api/me/export`) e exclusão de conta (apaga o usuário em `auth.users`, e o banco apaga o resto em cascata; as gravações no Storage são removidas antes).
- Tentativas guardam a resposta digitada (até 500 caracteres) para a professora revisar. Aviso na política.

### D11. Conteúdo
- `conjugate` usa só o présent de cada verbo no banco (102 questões, unidade `null` para os verbos fora do capítulo 5) e o laboratório gera os demais tempos na hora (ids `conj:verbo:tempo:pessoa`), sempre a partir das tabelas do e-book.
- Questões de múltipla escolha, ligar pares, ordenar palavras, ditado e fala são geradas de forma determinística a partir do vocabulário e das frases do e-book (`source: "ebook"`, pois o conteúdo vem do e-book). Só 7 questões têm `source: "generated"` (números e horas pelas regras do e-book) e 1 tradução de diálogo.
- Hífen e espaço são equivalentes na correção ("vingt-deux" = "vingt deux"). Pontuação é ignorada. Só acento divergente vira "quase certo" (50% de crédito).
- O texto do e-book tem erros e esquisitices próprias, listados em `content/REVIEW.md`.
- Áudio de referência: arquivos pré-gerados no Storage (`audio/fr/<hash>.mp3|wav`). Falta de arquivo: o botão usa a voz do navegador (exceto no ditado, para não vazar a resposta; no ditado há a alternativa "mostrar o texto", que não conta nota).
- Fala: "foi compreendido" palavra a palavra (LCS entre a transcrição e a frase, tolerante a acento e pontuação). Não há nota de sotaque.

### D12. O que não foi verificado neste ambiente
- Sem Docker: o Supabase local, o Storage real, o Auth real (GoTrue) e o Dockerfile/compose (só a sintaxe do compose foi validada) não rodaram aqui.
- O fluxo Playwright completo (`e2e/flow.spec.ts`) está escrito, mas não foi executado. O smoke (`e2e/smoke.spec.ts`: login, redirecionamento, cadastro, páginas legais, sem rolagem horizontal) foi executado e passou.
- As telas autenticadas compilam e passam em typecheck/lint/build, mas não foram abertas contra dados reais.
- Provider real de TTS/STT/IA e SMTP não foram exercitados (só os simulados e testes unitários).
- Métricas do admin leem até 20 mil tentativas (`max_rows` do `supabase/config.toml`). Em escala maior, mover para uma view ou RPC.
