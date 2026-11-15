# Colocar o app no ar (login e banco online)

Este guia leva o app do modo local para a internet, com login por e-mail e senha, banco de dados central e acesso de administradora para a instrutora. Dá para fazer só pelo celular. Os nomes de menus podem mudar nos sites; confira sempre a tela atual.

## O que cada peça faz

- **Supabase**: guarda os usuários (login), o banco de dados (alunos, respostas, progresso, tarefas) e os áudios gravados. A segurança por linha (RLS) já está nas migrations: o aluno só vê os próprios dados, a instrutora vê os alunos vinculados a ela, a administradora vê tudo.
- **Hospedagem do app** (Render, Vercel, VPS com o `docker-compose.yml`): roda o site.
- **Você**: cria a conta de administradora uma única vez em `/setup` e depois cadastra os alunos em Professora, Cadastrar aluno.

Custos e planos mudam: confira os preços atuais de Supabase e da hospedagem antes de assinar.

## Passo a passo

1. **Supabase**: crie um projeto em supabase.com. Escolha a região São Paulo (South America) para ficar no Brasil. Guarde a senha do banco.
2. **Fechar o cadastro público**: Authentication, Sign In / Providers, desligue "Allow new users to sign up". Assim só a instrutora cria contas.
3. **Banco**: abra SQL Editor, cole o conteúdo de `supabase/setup.sql` e clique em Run. Rode uma única vez.
4. **Chaves**: em Project Settings, API, copie a Project URL, a chave `anon` e a chave `service_role`. A `service_role` é secreta: só no servidor, nunca em site, chat ou repositório.
5. **Hospedagem**: no Render, New, Blueprint, aponte para este repositório (usa o `render.yaml`). Preencha as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`: o endereço final do site, com https
   - `SETUP_TOKEN`: invente um texto longo e secreto
6. **Instalação inicial**: abra `https://SEU-SITE/setup`, informe o `SETUP_TOKEN`, seu nome, e-mail e uma senha de pelo menos 10 caracteres. Isso cria a administradora e carrega o conteúdo do e-book. A página some depois disso. Depois apague a variável `SETUP_TOKEN`.
7. **Entrar**: faça login. Em Admin, Conteúdo, confira que as questões foram carregadas (use o botão de carregar se não).
8. **Alunos**: em Professora, Cadastrar aluno, informe nome, e-mail e uma senha provisória. Passe os dados ao aluno. Para remover o acesso, desative ou exclua o aluno na mesma área.
9. **Instalar no celular**: abra o site no Safari (iPhone) ou Chrome (Android) e use Adicionar à Tela de Início.

## Onde ficam os registros

Cada resposta do aluno vira uma linha em `attempts`, com resultado, tempo e pontos fracos. O progresso por conceito, as revisões e as tarefas têm tabelas próprias. A instrutora baixa o registro em CSV (Professora, Baixar registro de atividades) para abrir em Excel ou Google Planilhas. O backup diário está em `deploy/backup.sh` (VPS); no Supabase, confira as opções de backup do seu plano.

## LGPD

Dados de alunos são dados pessoais (e podem ser de menores). Mantenha o aceite de termos e da política ativo, informe a região do banco, restrinja quem é administrador e guarde as chaves só no servidor. Revise os textos legais em `/termos` e `/politica-de-privacidade` antes de abrir para alunos.

## Limites desta entrega

O fluxo contra um Supabase real (login, banco, armazenamento) e a hospedagem não puderam ser executados no ambiente de desenvolvimento. O banco foi testado em Postgres local (PGlite) com as mesmas migrations e a RLS. Faça um teste completo (administradora, um aluno de teste, uma lição, o CSV) antes de convidar os alunos.
