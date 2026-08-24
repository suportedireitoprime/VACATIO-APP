import { test, expect } from '@playwright/test';

/**
 * Smoke E2E dos fluxos cr\u00edticos.
 * Rodar: `bunx playwright test e2e/critical-flows.spec.ts`
 *
 * Cobre navega\u00e7\u00e3o p\u00fablica sem exigir credenciais reais — usa
 * seletores acess\u00edveis (role/aria-label/texto) para pegar regress\u00f5es
 * de layout, roteamento e crash da SPA antes de chegar aos usu\u00e1rios.
 */
const BASE = process.env.E2E_BASE_URL || 'http://localhost:8080';

test.describe('Fluxos cr\u00edticos', () => {
  test('Landing carrega sem erros de console cr\u00edticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('DevTools')) errors.push(m.text());
    });
    await page.goto(BASE + '/landing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('Tela de login abre e mostra campos', async ({ page }) => {
    await page.goto(BASE + '/auth', { waitUntil: 'domcontentloaded' });
    // Aceita e-mail ou telefone
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10_000 });
  });

  test('P\u00e1gina de assinatura renderiza os planos', async ({ page }) => {
    await page.goto(BASE + '/assinatura', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/premium|plano|assinar|gr\u00e1tis/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('Chat jur\u00eddico abre a tela do assistente', async ({ page }) => {
    await page.goto(BASE + '/assistente', { waitUntil: 'domcontentloaded' });
    // A tela do assistente deve estar acess\u00edvel; se redirecionar para auth, valida esse fluxo
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(url).toMatch(/(assistente|auth|login)/);
  });

  test('404 renderiza NotFound', async ({ page }) => {
    await page.goto(BASE + '/rota-que-nao-existe-xyz', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/n\u00e3o encontrad|404/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
