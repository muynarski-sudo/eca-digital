# Itens pendentes de revisão

Este arquivo lista o que está marcado com `needs_review: true`. Esses itens **não entram** em exercícios, flashcards, áudio nem tarefas de casa até a liberação. O comando `npm run content:validate` falha se algum item marcado não estiver listado aqui.

Para liberar um item: confirme com o nativo, troque `needs_review` para `false` em `scripts/content/*.ts`, rode `npm run content:build` e `npm run content:validate`.

## 1. Alfabeto do capítulo 2 (revisão com nativo)

As 26 letras com a pronúncia aportuguesada do e-book (unidade u02, categoria `alfabeto`). Pontos que chamam atenção, sem decisão tomada: "E" com pronúncia "õ", "H" como "áche", "W" como "duble v", "R" como "érrr".

| ID | Letra |
|---|---|
| v-u02-036 | A |
| v-u02-037 | B |
| v-u02-038 | C |
| v-u02-039 | D |
| v-u02-040 | E |
| v-u02-041 | F |
| v-u02-042 | G |
| v-u02-043 | H |
| v-u02-044 | I |
| v-u02-045 | J |
| v-u02-046 | K |
| v-u02-047 | L |
| v-u02-048 | M |
| v-u02-049 | N |
| v-u02-050 | O |
| v-u02-051 | P |
| v-u02-052 | Q |
| v-u02-053 | R |
| v-u02-054 | S |
| v-u02-055 | T |
| v-u02-056 | U |
| v-u02-057 | V |
| v-u02-058 | W |
| v-u02-059 | X |
| v-u02-060 | Y |
| v-u02-061 | Z |

## 2. Exercício "Il est un bon chirurgien" (capítulo 6)

| ID | Item |
|---|---|
| q-u06-009 | Coloque no feminino: "Il est un bon chirurgien." Gabarito do e-book: "Elle est une bonne chirurgienne". |

O enunciado e o gabarito estão pendentes. O exercício não aparece para o aluno.

## 3. Observações (não bloqueiam, para você decidir)

Pontos do e-book que podem estar incorretos ou foram normalizados na conversão. Não estão marcados `needs_review`, mas vale conferir:

| Onde | O que foi encontrado | O que foi feito |
|---|---|---|
| Cap. 8, estações (q-u08, "En ___, les fleurs commencent à pousser") | O gabarito é "printemps" com "en". No francês padrão, primavera costuma ser "au printemps". | Mantido como no e-book, com aviso na explicação. |
| Cap. 7, texto dos possessivos | O e-book traz "três Jolie" (typo). | Exibido como "très jolie". |
| Cap. 7, demonstrativos | "Ces arbres sont enormes" (sem acento). | Exibido como "énormes". |
| Cap. 2, nasais | "Martien (Martiano)". | Exibido como "marciano". |
| Cap. 6, feminino | "medicin" (provável typo de "médecin"). | Não usado em nenhum item. |
| Cap. 7, à + artigo | "Je vais aux EUA" (forma usual: "aux États-Unis"). | Mantido como no e-book (exercício "Il va ___ EUA"). |
| Cap. 7, gabarito dos possessivos (texto) | A 8ª lacuna é "nos" ("mais nos amis ne sortent pas"), construção estranha. | Mantido como no gabarito. |
| Cap. 8, carnaval | Gabarito "février"; carnaval também cai em março. | "février" oficial e "mars" aceito como variante. |
| Cap. 7, artigos (pág. 31) | Itens 2 a 4 aceitam definido ou indefinido. | Gabarito do e-book como oficial e a outra forma aceita como variante. |
| Cap. 10, diálogo do restaurante | O e-book não traz tradução. | Tradução acrescentada e marcada `source: "generated"` (d-u10-002). |
| Questões `generated` | Números 45, 58, 64, 85, 99 e horas 15h30 e 20h15 seguem as regras do e-book, mas não estão listados nele. | Marcadas `source: "generated"` para sua revisão. |
| Cap. 3 e cap. 8 | Atividades "Sua vez" e "Quel est le mois de ton anniversaire?" são abertas e sem gabarito. | Não viraram questões. |
| Tabelas de conjugação | "il/elle va manger" (falta "on") e "futur simples" no título. | Normalizados no parse (rótulo "futur simple"). |

## 4. Exercícios novos gerados (banco de 2.023 questões)

Os exercícios novos são derivados do que o e-book traz. Quase tudo reaproveita texto do e-book (`source: "ebook"`). Duas famílias seguem **regras** do e-book e por isso ficam `source: "generated"`, para você dar uma olhada:

| Família | Quantas | Como são feitas |
|---|---|---|
| Números de 1 a 99 (`q-numw-*`, `q-numd-*`) | 196 | `src/lib/content/french.ts`, `numberToFrench`. Bate com todos os exemplos do e-book (1 a 23, dezenas, 70 a 73, 81, 82, 90 a 92) e aplica as regras descritas (et un, hífen, 70 = 60+10, 90 = 80+10). Fica de fora o 80, porque o e-book escreve "quatre-vingt" e o padrão é "quatre-vingts". |
| Horas (`q-hr-*`) | 140 | `timeToFrench`, no relógio de 12 horas como o e-book ("16h = quatre heures"). Cobre hora cheia, minutos de 5 em 5 até 25, "et quart", "et demie" e "moins ...". Bate com os 7 exemplos do gabarito. Não gera casos que o e-book não cobre (meio-dia e meia-noite com minutos, "moins" que cai em meio-dia ou meia-noite). |

Famílias derivadas do e-book (marcadas `ebook`): vocabulário em múltipla escolha nos dois sentidos, escrita de vocabulário, artigo (le, la, l', un, une), feminino e masculino de pares do capítulo 6, ligar pares, e frases (tradução, ordenar, lacuna, ditado e fala). Conjugação: os 17 verbos nos 5 tempos e 6 pessoas, direto das tabelas.

Pontos de atenção:
- Questões de lacuna e de tradução de frases têm uma resposta oficial só (mais variações de pontuação, caixa e acento). Se você aceitar outra forma como correta, edite no painel do admin (Conteúdo) e acrescente a variante.
- O tom "tu" ou "vous" nas traduções de frases segue a frase do e-book.
- As tabelas de conjugação do e-book trazem "il/elle va manger" (sem "on") e "futur simples" no título; o parse normaliza.
