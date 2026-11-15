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
