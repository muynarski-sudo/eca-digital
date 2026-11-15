# DECISIONS.md

Registro de decisões técnicas do Falando Francês Prática. Cada decisão tem data, motivo e consequência.

## Plano (execução em fases, na ordem)

1. Fundação: Next.js, tokens de cor, contraste AA, qualidade (TS estrito, ESLint, Prettier, Vitest).
2. Parte 1: conteúdo estruturado (zod, 7 arquivos JSON, seed idempotente, relatório).
3. Parte 2: domínio puro (correção, SRS, domínio), migrations com RLS e testes de RLS, telas do aluno e da professora.
4. Parte 3: áudio (TTS), fala (STT), ditado, tarefa de casa, lembretes, purga de gravações.
5. Parte 4: multi-nível, conversa guiada (desligada), métricas administrativas.
6. LGPD, deploy (docker compose, HTTPS, backup), README, CLAUDE.md, relatório final.

## Riscos conhecidos

- **Conteúdo de francês**: o e-book tem erros e inconsistências próprias (ver content/REVIEW.md). Nada foi corrigido em silêncio.
- **Ambiente de build sem Docker**: o Supabase local (Docker) não roda neste ambiente. Testes de RLS usam PGlite (Postgres em WebAssembly) com as migrations reais. O teste Playwright ponta a ponta exige Supabase local e não foi executado aqui (ver relatório).
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

| Par                               | Razão                                    | Resultado       | Ajuste                                                                      |
| --------------------------------- | ---------------------------------------- | --------------- | --------------------------------------------------------------------------- |
| #EF4135 sobre branco              | 3,83                                     | falha (texto)   | texto vermelho usa #C4281D (5,72). #EF4135 fica para fundos, ícones e selos |
| #2E9E5B sobre branco              | 3,41                                     | falha (texto)   | texto verde usa #1E7A42 (5,36). #2E9E5B fica para ícones                    |
| branco sobre #EF4135              | 3,83                                     | só texto grande | não usar texto pequeno branco sobre o vermelho da marca                     |
| #0055A4 sobre branco / azul claro | 7,41 / 6,51                              | passa           | sem ajuste                                                                  |
| cinza de texto secundário         | #5F6B7A: 5,5 (branco), 4,77 (azul claro) | passa           | cinza escolhido para passar nos dois fundos                                 |

Os pares são verificados por teste (`tests/contrast.test.ts`).

### D5. Hotmart removida

Por decisão do responsável, a venda do e-book pela Hotmart foi descartada. O webhook, o log de eventos e as compras pendentes foram removidos (migration `20260101000007_remove_hotmart.sql`). O acesso depende de `subscriptions` ativa concedida manualmente pela professora (dias de validade). A integração antiga continua recuperável no commit `aff1e15` caso a venda volte. O valor `hotmart` do enum `subscription_origin` permanece no banco (enums não perdem valores com segurança), sem uso.

Regra de acesso (`has_active_access`): perfil ativo e assinatura ativa dentro da validade; assinatura cancelada mantém o período já pago; reembolso, chargeback e atraso bloqueiam na hora (estados mantidos para um futuro adaptador de cobrança).

### D6. Testes de RLS com PGlite

Sem Docker, os testes de RLS (`tests/rls.test.ts`) aplicam as migrations reais em PGlite (Postgres em WebAssembly), com um shim mínimo de `auth.users`, `auth.uid()` e dos papéis `anon`/`authenticated`. Cobertura: aluno não lê nem escreve dados de outro, professora vê só alunos vinculados, admin vê tudo, anônimo não lê nada, gatilhos de proteção de colunas, acesso por assinatura. Limitação: não cobre o Storage nem o GoTrue reais; rode o mesmo cenário contra `supabase start` quando tiver Docker.

### D7. Modelo de acesso e escrita

- O aluno escreve os próprios dados derivados (`srs_cards`, `item_mastery`, `unit_progress`, `skill_scores`), como pedido. Ele poderia, em tese, adulterar o próprio progresso por chamada direta à API. Mitigação: `attempts` é imutável para o aluno e é a fonte que a professora vê. Se isso virar problema, mover as escritas para uma função SECURITY DEFINER ou para o servidor.
- Liberação manual de unidade fica em `unit_unlocks` (só a professora grava), para o aluno não conseguir se liberar.
- Papéis `teacher` e `admin` nunca nascem no cadastro; são atribuídos pelo admin com service role (ou por SQL no seed).
- Conteúdo com `needs_review` fica invisível ao aluno também no banco (RLS), além de ser filtrado no app.
- A professora não ouve gravações de voz (minimização). Ela vê a transcrição e o resultado nas tentativas.

### D8. Calibragem do domínio (risco) [substituída pelo D14]

Com alfa 0,3 partindo de 0, são necessários cerca de 4 acertos por item para chegar a 70% naquele item, e a unidade tem de 17 a 41 questões. Isso é fiel à especificação, mas pode ser lento para liberar a unidade seguinte. Todas as constantes estão em `src/lib/domain/mastery.ts` (alfa, carência de 7 dias, meia-vida de 30 dias, 70% para abrir, 90% para "dominada"), e a professora pode liberar manualmente. Recomendo calibrar depois de algumas semanas de uso real.

### D9. Transferência internacional de dados (LGPD)

Cada provedor abaixo só recebe dados se for ativado. Todos estão desligados ou simulados por padrão. A professora/escola precisa firmar o contrato ou aceitar os termos de cada um, e o advogado responsável deve validar a base legal e atualizar a Política de Privacidade.

| Provedor                                        | O que recebe                             | Quando                    | Observação                                                                                       |
| ----------------------------------------------- | ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| Supabase (banco, Auth, Storage)                 | todos os dados da plataforma             | sempre                    | Escolher a região São Paulo (sa-east-1) mantém os dados no Brasil                                |
| TTS (`TTS_PROVIDER=openai`)                     | apenas textos em francês do e-book       | ao rodar `audio:generate` | sem dado pessoal; EUA no caso da OpenAI                                                          |
| STT (`STT_PROVIDER=openai`)                     | áudio da voz do aluno                    | a cada tentativa de fala  | dado pessoal (voz). Não guardamos o áudio, salvo opção do aluno (30 dias). EUA no caso da OpenAI |
| IA de conversa (`AI_CONVERSATION_ENABLED=true`) | texto digitado pelo aluno na cena        | a cada mensagem           | desligada por padrão; nada é gravado no nosso banco; EUA no caso da Anthropic                    |
| SMTP (lembretes)                                | e-mail e nome do aluno, título da tarefa | job diário                | depende do provedor escolhido                                                                    |

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
- Contra o Supabase real (GoTrue, PostgREST, Storage) nada foi executado. O fluxo Playwright rodou contra o modo local (ver D13).
- Provider real de TTS/STT/IA e SMTP não foram exercitados (só os simulados e testes unitários).
- Métricas do admin leem até 20 mil tentativas (`max_rows` do `supabase/config.toml`). Em escala maior, mover para uma view ou RPC.

### D13. Modo local e cadastro feito pela professora

Decisão do responsável: por enquanto o app roda localmente, sem Supabase, só com um usuário de teste de professora e um de aluno, e a venda é só para alunos do círculo dela.

- **Modo local** (`APP_BACKEND=local`, ou automático quando `NEXT_PUBLIC_SUPABASE_URL` não existe): `src/lib/local` implementa um cliente com a mesma interface do supabase-js para as chamadas que o app usa (select, filtros, insert, update, upsert, delete, rpc, auth e storage em disco) sobre o PGlite. As migrations e a RLS são as mesmas da produção; cada consulta roda numa transação com `set local role authenticated` e o usuário da sessão, então o isolamento entre alunos continua valendo. O código das telas é o mesmo nos dois modos.
- Login local: senha com scrypt e sal; cookie `ff_session` assinado (HMAC-SHA256, 7 dias, httpOnly). O segredo padrão (`LOCAL_SESSION_SECRET`) é só para uso local.
- Bootstrap local: aplica migrations, carrega o conteúdo e cria `professora@teste.local` (admin, para testar tudo) e `aluno@teste.local` com histórico simulado.
- **Sem autocadastro**: removidos `/cadastro` e o convite por e-mail. A professora cadastra (nome, e-mail, senha gerada por ela, prazo opcional), pausa, redefine senha e descadastra (apaga a conta e os dados em cascata, mais as gravações). O aceite de política, termo e aviso de maioridade acontece no primeiro acesso (`/aceite`) e continua registrado em `consents` com a versão.
- Segurança do modo local: o cookie e o hash existem só no modo local; no Supabase o login é o do Supabase Auth. O modo local não deve ser exposto à internet.
- Recuperação de senha: no modo local o aluno pede à professora. No Supabase o fluxo por e-mail continua disponível.
- Limites: um processo por vez no banco (PGlite), então seeds e scripts não rodam com o servidor ligado; sem e-mail; o áudio de referência usa a voz do navegador (e o ditado também, só nesse modo).
- Verificado: o fluxo Playwright (11 testes) roda de verdade contra o app em modo local, incluindo cadastrar aluno, primeiro acesso, descadastrar, pausar acesso e isolamento do painel da professora.

### D14. Banco grande de exercícios, sorteio sem repetição e domínio por conceito

Pedido do responsável: criar muito mais exercícios a partir do e-book, em ordem aleatória, sem repetir, de modo que o aluno possa entrar a qualquer hora e sempre ter lições novas.

- **Banco**: de 339 para 1.912 questões, geradas de forma determinística por `scripts/content/generators.ts` (rodar de novo dá os mesmos ids). Nada de francês novo: reorganiza vocabulário, frases e tabelas do e-book. Números (1 a 99) e horas usam as regras do e-book e ficam `source: "generated"` (ver `content/REVIEW.md`, seção 4). Enunciados repetidos (ignorando caixa) são descartados na geração, com o gabarito do e-book na frente, e o validador falha se houver. Ele também falha se houver questão sem `concept`, com opções repetidas ou cuja resposta oficial não seja corrigida como certa.
- **Conceito**: cada questão tem um `concept` (ponto de conteúdo; por exemplo `v:<vocab>`, `ph:<frase>`, `num:73`, `hr:14:40`, `conj:etre:present:je`). Questões do mesmo conceito são variações uma da outra. Migration `20260101000008`.
- **Sorteio** (`src/lib/domain/select.ts`, testado): nunca devolve uma pergunta já respondida enquanto houver pergunta nova; entre as novas, vêm primeiro as de conceitos em que o aluno errou por último (reforço com **outra** pergunta, não a mesma), depois conceitos ainda não vistos e por último os já acertados; no máximo uma pergunta por conceito por sessão; sem mais de dois tipos iguais seguidos; só quando as novas acabam recicla, das mais antigas e das erradas. Sorteio ponderado (a unidade mais fraca tem mais chance no treino de hoje). "Mais 10 exercícios novos" ao fim de cada sessão.
- **Treino de hoje** exclui ditado e fala (dependem de áudio e microfone); a prática de unidade inclui todos os tipos.
- **Domínio por conceito** (substitui o D8): sem repetição, cada pergunta é vista uma vez, então o domínio de "item" por pergunta não se sustentaria. Agora o domínio é guardado por conceito (variações compartilham), a primeira observação define o valor e as seguintes usam a média móvel (alfa 0,3, decaimento por tempo sem prática). O domínio da unidade é a média ponderada dos conceitos praticados vezes a cobertura (conceitos praticados divididos pela meta, que é metade dos conceitos da unidade, no máximo 30). Resultado: com cerca de 15 a 30 conceitos praticados e bom aproveitamento a unidade passa de 70% e a próxima abre; a professora continua podendo liberar. Constantes em `src/lib/domain/mastery.ts`.
- **Repetição espaçada (SRS)** continua sendo registrada por pergunta, mas deixou de dirigir a fila: o reforço agora é por conceito. A tela inicial mostra quantos pontos estão para reforçar.
- Quando o banco inteiro for percorrido, o sorteio recicla do mais antigo para o mais novo (e as erradas primeiro). Com cerca de 2.000 perguntas, são 200 sessões de 10 até isso acontecer.
- **Modo local**: as migrations novas são aplicadas ao abrir (registradas em `_local_migrations`) e o conteúdo é recarregado sozinho quando `content/data` muda.
- **API do Supabase em produção**: as consultas de metadados paginam de 1.000 em 1.000, mas `max_rows` do projeto precisa ser pelo menos 1.000 (padrão). O arquivo `supabase/config.toml` do desenvolvimento local usa 20.000.

### D15. Área lúdica "Brincar" e avatar

- Conteúdo: alfabeto completo (A a Z) com a voz da avatar, e cinco brincadeiras: alfabeto (inclui "ouvir o alfabeto todo"), "Que letra é essa?" (ouvir e escolher), soletrar palavras do e-book (3 a 8 letras, sem acento), memória (francês e português) e "Repita comigo" (frases do e-book, normal ou devagar). Estrelas ficam guardadas no próprio aparelho.
- Sem repetição: soletrar, memória e frases guardam o que já saiu e só recomeçam o ciclo quando acaba (`pickUnseen`, testado).
- Avatar "Iasmyn": SVG animado (boca que abre e fecha enquanto fala, piscar, leve balanço da cabeça), sem imagens nem serviços externos. Respeita "reduzir movimento". A fala usa a voz do navegador (Web Speech API); sem voz, a animação e a legenda seguem pelo tempo estimado. Tudo é legendado no balão, para quem não ouve.
- Um avatar de vídeo com IA (lábios sincronizados de verdade) exigiria um serviço externo. Não foi feito. Se um dia for, é um provider atrás de interface, como os de voz, com a transferência internacional registrada no D9.
- O alfabeto lúdico é texto gerado por esta plataforma e está listado para revisão em `content/REVIEW.md` (seção 5). O alfabeto do e-book segue pendente e fora dos exercícios.
- O módulo (`src/lib/play`) não depende de framework: o app (Next) e a demo/app instalável usam o mesmo código.
- Incidente corrigido: expressões regulares com caracteres combinados crus (U+0300 a U+036F) quebravam a demo quando o HTML era aberto sem declaração de charset. Passaram a usar escapes `\u0300`.
- **Voz no celular** (correção): a Web Speech API é temperamental no iPhone e no Android. A fala agora só cancela a anterior se houver algo tocando (cancelar logo antes de falar faz o aparelho engolir a fala), chama `resume()`, carrega a lista de vozes, "destrava" a voz no primeiro toque e, se o aparelho não começar a falar em 1,5 s, mostra um aviso na tela com o que conferir (volume, modo silencioso, voz em francês instalada). Há também o botão "Testar a voz". Sem voz, a boca anima e a legenda continua.

### D16. Áudio gravado para a Iasmyn (iPhone sem som)

- Problema: no iPhone a voz do navegador (Web Speech) fica muda mesmo com a boca animada, principalmente com o botão de silêncio ligado ou no app instalado.
- Solução: arquivos `.mp3` pré-gerados para tudo o que a área Brincar fala (303 textos: nomes das letras, palavras, frases, vocabulário e frases fixas), tocados por um elemento `<audio>` liberado no primeiro toque (o que o iPhone aceita, inclusive no modo silencioso). Sem arquivo, cai na voz do navegador; sem nenhuma das duas, mostra o aviso na tela.
- Geração: Piper (voz neural offline) com `fr_FR-siwis-medium`, base SIWIS da Universidade de Edimburgo, **CC BY 4.0** (atribuição exibida no app). Nenhum dado sai do computador. O nome do arquivo é um hash do texto (`src/lib/play/clipkey.ts`), e há teste garantindo que todo texto falado tem chave única.
- A demo em página única embute os áudios (data URI, 3,2 MB). O app instalável pré-guarda todos no service worker.
- **Qualidade não auditada por ouvido nem por nativo:** conferi só duração, volume e que cada arquivo toca. A pronúncia dos nomes das letras (que são escritos como palavras, "ache", "elle", "double vé"...) e das palavras curtas precisa ser ouvida por quem fala francês (ver `content/REVIEW.md`, seção 5). Se algum áudio estiver ruim, apague o `.mp3` e gere de novo, ou grave o seu.
- Os áudios das frases e palavras são derivados do conteúdo do e-book (mesma observação de exposição pública do app instalado).

### D17. Login, banco online e administradora

- O login por e-mail e senha já existia (Supabase Auth em produção, cookie assinado no modo local). Não há autocadastro: a instrutora cadastra os alunos.
- **Banco central:** Supabase (Postgres com RLS) guarda usuários, respostas (`attempts`), progresso por conceito, revisões e tarefas. A RLS dá ao aluno só os próprios dados, à instrutora os alunos vinculados e à administradora tudo. `supabase/setup.sql` junta todas as migrations para colar uma vez no SQL Editor (gerado por `scripts/build-setup-sql.sh`; um teste confere que está em dia e que instala em Postgres limpo com RLS em todas as tabelas).
- **Primeira administradora:** página `/setup`, protegida por `SETUP_TOKEN` (comparação em tempo constante). Só existe enquanto não houver administradora e responde 404 depois. Cria o usuário, define o papel e carrega o conteúdo do e-book.
- **Carregar conteúdo:** botão em Admin, Conteúdo (`reloadContent`), só para administradora. Substitui edições feitas nos itens do e-book.
- **Registro para a instrutora:** `/api/staff/export` gera CSV (UTF-8 com BOM, separador ponto e vírgula, células que começam com `=`, `+`, `-`, `@` são neutralizadas contra injeção de fórmula). A RLS decide as linhas; aluno recebe 403.
- **Instalável:** `manifest.webmanifest` e ícones no app Next (o app instalado estático em `docs/` segue separado e sem login).
- **Não validado:** o fluxo contra um Supabase real (GoTrue, PostgREST, Storage) e a hospedagem não rodaram aqui; só o Postgres local (PGlite) com as mesmas migrations. Fazer teste completo antes de convidar alunos (ver `DEPLOY.md`).
