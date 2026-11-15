import { expect, test } from '@playwright/test';

// Não precisa de Supabase: só páginas públicas e redirecionamentos.
test('login: identidade visual, rótulos e foco por teclado', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bienvenu(e)!' })).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByLabel('Senha')).toBeVisible();
  await expect(page.getByRole('button', { name: 'On y va!' })).toBeVisible();
  const bar = page.locator('div[aria-hidden="true"].flex.h-1\\.5').first();
  await expect(bar).toBeVisible();
  await page.keyboard.press('Tab'); // pular para o conteúdo
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('E-mail')).toBeFocused();
});

test('página protegida redireciona para o login', async ({ page }) => {
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login/);
});

test('não há autocadastro', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page).toHaveURL(/\/login/); // sem sessão, qualquer rota fora da lista pública vai ao login
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Criar conta' })).toHaveCount(0);
});

test('política de privacidade e termo são públicos', async ({ page }) => {
  for (const path of ['/politica-de-privacidade', '/termos']) {
    const res = await page.goto(path);
    expect(res?.status()).toBeLessThan(500);
  }
});

test('sem rolagem horizontal no celular', async ({ page }) => {
  await page.goto('/login');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
