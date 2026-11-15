import { expect, test, type Page } from '@playwright/test';

/**
 * Fluxo principal no modo local (sem Supabase): login, exercícios, flashcards, visão da professora,
 * cadastro e descadastro de aluno pela professora.
 * Suba o app com `npm run dev:local` (ou E2E_BASE_URL apontando para ele) e rode `npm run test:e2e`.
 */
const PROF = { email: 'professora@teste.local', senha: 'professora123' };
const ALUNO = { email: 'aluno@teste.local', senha: 'aluno123' };

async function login(page: Page, email: string, senha: string, esperaEntrar = true) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'On y va!' }).click();
  if (esperaEntrar) await expect(page).not.toHaveURL(/\/login/);
}
const alerta = (page: Page, texto: string) => page.getByRole('alert').filter({ hasText: texto });
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login/);
}

test('login com senha errada mostra erro gentil', async ({ page }) => {
  await login(page, ALUNO.email, 'errada123', false);
  await expect(alerta(page, 'E-mail ou senha não conferem')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('aluno: início, treino de hoje, flashcards e evolução', async ({ page }) => {
  await login(page, ALUNO.email, ALUNO.senha);
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByRole('heading', { name: /Bienvenu\(e\), Aluno/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Progresso do nível A1/ })).toBeVisible();
  await expect(page.getByText('Tarefa da professora')).toBeVisible();

  await page
    .getByRole('link', { name: /On y va!|Começar pela unidade 1/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/praticar/);
  let answered = 0;
  for (let i = 0; i < 4; i++) {
    const text = page.getByLabel('Sua resposta');
    const radio = page.getByRole('radio').first();
    const selects = page.locator('select');
    const palavras = page.getByLabel('Palavras disponíveis').getByRole('button');
    if (await text.count()) await text.fill('resposta qualquer');
    else if (await radio.count()) await radio.check();
    else if (await selects.count())
      for (let k = 0; k < (await selects.count()); k++)
        await selects.nth(k).selectOption({ index: 1 });
    else if (await palavras.count()) await palavras.first().click();
    else break;
    await page.getByRole('button', { name: 'Conferir' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: /Voilà|Quase|Ainda não/ }),
    ).toBeVisible();
    answered++;
    await page.getByRole('button', { name: /Continuar|Ver resumo/ }).click();
  }
  expect(answered).toBeGreaterThan(0);

  await page.goto('/flashcards');
  await page.getByRole('button', { name: 'Mostrar tradução' }).click();
  await page.getByRole('button', { name: /^Bom/ }).click();
  await expect(page.getByText(/2 de|Voilà, bravo!/)).toBeVisible();

  await page.goto('/evolucao');
  await expect(page.getByRole('heading', { name: 'Domínio por unidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Por habilidade' })).toBeVisible();
});

test('o aluno faz várias sessões seguidas sem ver a mesma pergunta duas vezes', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await login(page, ALUNO.email, ALUNO.senha);
  await page.goto('/praticar?modo=treino');
  const vistos: string[] = [];
  for (let sessao = 0; sessao < 4; sessao++) {
    for (let i = 0; i < 10; i++) {
      const prompt = page.locator('section[aria-label="Exercício"] .text-lg.font-bold').first();
      await expect(prompt).toBeVisible();
      vistos.push((await prompt.innerText()).trim());
      const text = page.getByLabel('Sua resposta');
      const radio = page.getByRole('radio').first();
      const selects = page.locator('main select');
      const palavras = page.getByLabel('Palavras disponíveis').getByRole('button');
      if (await text.count()) await text.fill('resposta qualquer');
      else if (await radio.count()) await radio.check();
      else if (await selects.count())
        for (let k = 0; k < (await selects.count()); k++)
          await selects.nth(k).selectOption({ index: 1 });
      else if (await palavras.count()) await palavras.first().click();
      await page.getByRole('button', { name: 'Conferir' }).click();
      await expect(
        page.getByRole('status').filter({ hasText: /Voilà|Quase|Ainda não/ }),
      ).toBeVisible();
      await page.getByRole('button', { name: /Continuar|Ver resumo/ }).click();
    }
    await page.getByRole('link', { name: 'Mais 10 exercícios novos' }).click();
    await expect(page).toHaveURL(/\/praticar/);
  }
  expect(vistos).toHaveLength(40);
  expect(new Set(vistos).size).toBe(40);
});

test('brincar: alfabeto completo, avatar, jogos de letra, soletrar e memória', async ({ page }) => {
  await login(page, ALUNO.email, ALUNO.senha);
  await page.getByRole('link', { name: 'Brincar' }).click();
  await expect(page.getByRole('heading', { name: 'Brincar com a Iasmyn' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Iasmyn/ })).toBeVisible();

  // alfabeto: as 26 letras
  await page
    .getByRole('button', { name: /Alfabeto/ })
    .first()
    .click();
  await expect(page.locator('.pl-letter')).toHaveCount(26);
  await page.getByRole('button', { name: 'Letra W, double vé' }).click();
  await expect(page.locator('.pl-balloon')).toContainText('W: double vé');
  await expect(page.locator('.pl-detail')).toContainText(
    'Ainda não há palavra do e-book com essa letra',
  );
  await page.getByRole('button', { name: 'Letra B, bé' }).click();
  await expect(page.locator('.pl-detail')).toContainText('Palavra do e-book:');
  await page.getByRole('button', { name: '▶ Ouvir o alfabeto todo' }).click();
  await expect(page.getByRole('button', { name: '■ Parar' })).toBeVisible();
  await page.getByRole('button', { name: '■ Parar' }).click();

  // que letra é essa: 10 rodadas
  await page.getByRole('button', { name: '← Voltar' }).click();
  await page.getByRole('button', { name: /Que letra é essa/ }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator('.pl-opt').first().click();
    await expect(page.locator('.pl-opt.right')).toHaveCount(1);
    await page.getByRole('button', { name: /Próxima|Ver resultado/ }).click();
  }
  await expect(page.getByText(/letras certas/)).toBeVisible();

  // soletrar com a dica
  await page.getByRole('button', { name: '← Voltar' }).click();
  await page
    .getByRole('button', { name: /Soletrar/ })
    .first()
    .click();
  await expect(page.locator('.pl-slot').first()).toBeVisible();
  const n = await page.locator('.pl-slot').count();
  for (let k = 0; k < n; k++) {
    await page.getByRole('button', { name: 'Dica: mostrar a próxima letra' }).click();
    const msg = await page.locator('.pl-msg').innerText();
    const letter = /é ([A-Z]) \(/.exec(msg)![1]!;
    await page
      .locator('.pl-key:not([disabled])', { hasText: new RegExp(`^${letter}$`) })
      .first()
      .click();
  }
  await expect(page.locator('.pl-msg')).toContainText('Palavra completa');

  // memória: virar duas cartas conta uma jogada
  await page.getByRole('button', { name: '← Voltar' }).click();
  await page
    .getByRole('button', { name: /Memória/ })
    .first()
    .click();
  await expect(page.locator('.pl-mem')).toHaveCount(12);
  await page.locator('.pl-mem').nth(0).click();
  await page.locator('.pl-mem').nth(1).click();
  await expect(page.getByText('Jogadas: 1')).toBeVisible();
});

test('aluno não acessa o painel da professora', async ({ page }) => {
  await login(page, ALUNO.email, ALUNO.senha);
  await page.goto('/professora');
  await expect(page).toHaveURL(/\/inicio/);
});

test('professora: lista de alunos, detalhe e atribuir tarefa', async ({ page }) => {
  await login(page, PROF.email, PROF.senha);
  await expect(page).toHaveURL(/\/professora/);
  await page.getByRole('link', { name: 'Aluno Teste' }).click();
  await expect(page.getByRole('heading', { name: 'Domínio por unidade' })).toBeVisible();
  await page.getByLabel('Título').fill('Revisão da unidade 2');
  await page.locator('#unitId').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Atribuir' }).click();
  await expect(page.getByText('Tarefa atribuída')).toBeVisible();
});

test('professora cadastra um aluno, ele entra, aceita os termos, e depois é descadastrado', async ({
  page,
}) => {
  const stamp = Date.now();
  const nome = `Maria ${stamp}`;
  const email = `novo${stamp}@teste.local`;
  const senha = 'minha-senha-123';
  await login(page, PROF.email, PROF.senha);
  await page.goto('/professora/cadastrar');
  await page.getByLabel('Nome do aluno').fill(nome);
  await page.getByLabel('E-mail (será o login)').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Cadastrar aluno' }).click();
  await expect(page.getByRole('status')).toContainText('Aluno cadastrado');
  await logout(page);

  // primeiro acesso: precisa aceitar política, termo e aviso de maioridade
  await login(page, email, senha);
  await expect(page).toHaveURL(/\/aceite/);
  await expect(page.getByRole('checkbox').first()).toHaveAttribute('required', '');
  for (const cb of await page.getByRole('checkbox').all()) await cb.check();
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByRole('heading', { name: /Bienvenu\(e\), Maria/ })).toBeVisible();
  await logout(page);

  // descadastrar
  await login(page, PROF.email, PROF.senha);
  await page.getByRole('link', { name: nome }).click();
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('x');
  await page.getByRole('button', { name: 'Descadastrar aluno' }).click();
  await expect(alerta(page, 'Digite EXCLUIR')).toBeVisible();
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
  await page.getByRole('button', { name: 'Descadastrar aluno' }).click();
  await expect(page.getByText('Aluno descadastrado')).toBeVisible();
  await expect(page.getByRole('link', { name: nome })).toHaveCount(0);
  await logout(page);

  // o login dele deixou de funcionar
  await login(page, email, senha, false);
  await expect(alerta(page, 'E-mail ou senha não conferem')).toBeVisible();
});

test('aluno pausado pela professora cai na página de acesso', async ({ browser }) => {
  const prof = await (await browser.newContext()).newPage();
  await login(prof, PROF.email, PROF.senha);
  await prof.getByRole('link', { name: 'Aluno Teste' }).click();
  await prof.getByRole('button', { name: 'Pausar acesso' }).click();
  await expect(prof.getByRole('button', { name: 'Liberar acesso' })).toBeVisible();

  const aluno = await (await browser.newContext()).newPage();
  await login(aluno, ALUNO.email, ALUNO.senha);
  await expect(aluno).toHaveURL(/\/acesso/);
  await expect(aluno.getByRole('heading', { name: 'Seu acesso está pausado' })).toBeVisible();

  await prof.getByRole('button', { name: 'Liberar acesso' }).click();
  await expect(prof.getByRole('button', { name: 'Pausar acesso' })).toBeVisible();
  await aluno.goto('/inicio');
  await expect(aluno).toHaveURL(/\/inicio/);
});
