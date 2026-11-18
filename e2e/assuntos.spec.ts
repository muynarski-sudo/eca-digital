import { expect, test, type Page } from '@playwright/test';

async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('aluno@teste.local');
  await page.getByLabel('Senha').fill('aluno123');
  await page.getByRole('button', { name: 'On y va!' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('assuntos: lista, pratica por assunto, nível aparece e a conjugação só treina o présent', async ({
  page,
}) => {
  await entrar(page);
  await page.goto('/assuntos');
  await expect(page.getByRole('heading', { name: 'Assuntos', level: 1 })).toBeVisible();
  for (const nome of [
    'Apresentação',
    'Viagem',
    'Restaurante e pedidos',
    'Compras',
    'Trabalho e profissões',
    'Horário do dia',
  ])
    await expect(page.getByRole('heading', { name: new RegExp(nome) })).toBeVisible();

  await page.goto('/praticar?assunto=apresentacao');
  await expect(page.getByText(/Nível \d, (Iniciante|Intermediário|Avançado)/)).toBeVisible();
  await expect(page.getByLabel('Nível e assunto')).toContainText('Apresentação');
  await expect(page.getByLabel('Nível e assunto')).toContainText('Nível 1');

  await page.goto('/praticar?assunto=apresentacao&nivel=3');
  await expect(page.getByText(/Nível 3, Avançado/)).toBeVisible();

  await page.goto('/conjugacao');
  const tempos = await page.locator('#tempo option').allTextContents();
  expect(tempos.filter((t) => !t.includes('só consulta')).map((t) => t.trim())).toEqual([
    'Présent',
  ]);
  await page.goto('/conjugacao?tempo=passe_compose&modo=praticar');
  await expect(page.getByText(/ainda não é ensinado/)).toBeVisible();
});

test('correção tolerante: sem acento e com o pronome contam como certo', async ({ page }) => {
  await entrar(page);
  await page.goto('/conjugacao?verbo=conj-avoir&tempo=present&modo=praticar');
  await page.getByLabel('Sua resposta').fill("j'ai");
  await page.getByRole('button', { name: /Conferir|Verificar|Responder/ }).click();
  await expect(page.getByText('Voilà, bravo!')).toBeVisible();
});
