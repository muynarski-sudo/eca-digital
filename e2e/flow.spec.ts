import { expect, test, type Page } from '@playwright/test';

/**
 * Fluxo principal (login, sessão de exercícios, flashcards, visão da professora).
 * Exige Supabase local com migrations aplicadas, `npm run content:seed` e `npm run db:seed-dev`.
 * Rode com: E2E_FLOW=1 npm run test:e2e
 */
test.skip(!process.env.E2E_FLOW, 'defina E2E_FLOW=1 com o Supabase local no ar');

const PASSWORD = 'senha-dev-123';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'On y va!' }).click();
}

test('aluna: treino de hoje e flashcards', async ({ page }) => {
  await login(page, 'ana@dev.local');
  await expect(page).toHaveURL(/\/inicio/);
  await expect(page.getByRole('heading', { name: /Bienvenu\(e\), Ana/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Progresso do nível A1/ })).toBeVisible();

  await page
    .getByRole('link', { name: /On y va!|Começar pela unidade 1/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/praticar/);
  for (let i = 0; i < 3; i++) {
    const text = page.getByLabel('Sua resposta');
    if (await text.count()) {
      await text.fill('resposta qualquer');
      await page.getByRole('button', { name: 'Conferir' }).click();
    } else {
      const radio = page.getByRole('radio').first();
      if (await radio.count()) {
        await radio.check();
        await page.getByRole('button', { name: 'Conferir' }).click();
      } else {
        break; // tipos sem entrada simples (ordenar, ligar, fala)
      }
    }
    await expect(
      page.getByRole('status').filter({ hasText: /Voilà|Quase|Ainda não/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Continuar|Ver resumo/ }).click();
  }

  await page.goto('/flashcards');
  await page.getByRole('button', { name: 'Mostrar tradução' }).click();
  await page.getByRole('button', { name: /^Bom/ }).click();
  await expect(page.getByText(/2 de|1 de|Voilà, bravo!/)).toBeVisible();
});

test('professora: lista de alunos e detalhe', async ({ page }) => {
  await login(page, 'professora@dev.local');
  await expect(page).toHaveURL(/\/professora/);
  await expect(page.getByRole('link', { name: 'Ana Aluna' })).toBeVisible();
  await page.getByRole('link', { name: 'Ana Aluna' }).click();
  await expect(page.getByRole('heading', { name: 'Domínio por unidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atribuir tarefa de casa' })).toBeVisible();
});

test('aluna não acessa o painel da professora', async ({ page }) => {
  await login(page, 'ana@dev.local');
  await page.goto('/professora');
  await expect(page).toHaveURL(/\/inicio/);
});
