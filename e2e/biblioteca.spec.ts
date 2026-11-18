import { expect, test, type Page } from '@playwright/test';

async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('aluno@teste.local');
  await page.getByLabel('Senha').fill('aluno123');
  await page.getByRole('button', { name: 'On y va!' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('início mostra Leitura, Gramática e Vocabulário', async ({ page }) => {
  await entrar(page);
  const nav = page.getByRole('navigation', { name: 'Áreas de estudo' });
  for (const t of ['Leitura', 'Gramática', 'Vocabulário'])
    await expect(nav.getByText(t)).toBeVisible();
});

test('leitura: níveis, texto, áudio e perguntas', async ({ page }) => {
  await entrar(page);
  await page.goto('/leitura');
  for (const l of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    await expect(page.getByRole('link', { name: new RegExp(`Nível ${l},`) })).toBeVisible();
  await page.getByRole('link', { name: /Nível A1,/ }).click();
  await page.getByRole('link', { name: /Je m'appelle Camille/ }).click();
  await expect(page.getByRole('article', { name: 'Texto' })).toContainText("Je m'appelle Camille");
  const audio = page.locator('audio');
  await expect(audio).toHaveAttribute('src', '/audio/reading/rd-a1-presentation.mp3');
  const r = await page.request.get('/audio/reading/rd-a1-presentation.mp3');
  expect(r.status()).toBe(200);
  expect(r.headers()['content-type']).toMatch(/audio/);
  expect((await r.body()).length).toBeGreaterThan(10000);
  const perguntas = page.locator('ol > li').filter({ has: page.locator('fieldset') });
  await expect(perguntas).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Verificar respostas' })).toBeDisabled();
  for (let i = 0; i < 5; i++) await perguntas.nth(i).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Verificar respostas' }).click();
  await expect(page.getByText(/Você acertou \d de 5/)).toBeVisible();
});

test('leitura: Camille, 25 anos (resposta certa aparece como certa)', async ({ page }) => {
  await entrar(page);
  await page.goto('/leitura/a1/rd-a1-presentation');
  const q2 = page
    .locator('ol > li')
    .filter({ has: page.locator('fieldset') })
    .nth(1);
  await q2.getByLabel('25 anos').check();
  const outros = page.locator('ol > li').filter({ has: page.locator('fieldset') });
  for (const i of [0, 2, 3, 4]) await outros.nth(i).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Verificar respostas' }).click();
  await expect(q2.getByText('Certo!')).toBeVisible();
});

test('gramática e vocabulário por nível', async ({ page }) => {
  await entrar(page);
  await page.goto('/gramatica');
  for (const l of ['A1', 'A2', 'B1', 'B2'])
    await expect(page.getByRole('link', { name: new RegExp(`Nível ${l},`) })).toBeVisible();
  await expect(page.getByRole('link', { name: /Nível C1,/ })).toHaveCount(0);
  await page.goto('/gramatica/a2');
  await expect(page.getByText(/Tempo: (Passé composé|Futur proche)/).first()).toBeVisible();
  await page.goto('/vocabulario/a2');
  await expect(page.getByRole('button', { name: 'Ouvir a palavra' })).toBeVisible();
  await page.goto('/vocabulario');
  for (const l of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    await expect(page.getByRole('link', { name: new RegExp(`Nível ${l},`) })).toBeVisible();
});
