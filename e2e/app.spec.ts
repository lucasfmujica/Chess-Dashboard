import { test, expect, navButton } from './fixtures';

test.describe('Chess Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Jaque\+/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  });

  test('should display overview tab by default', async ({ page }) => {
    await expect(navButton(page, 'Resumen')).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate between tabs', async ({ page }) => {
    for (const tab of ['Progreso de ELO', 'Torneos', 'Repertorio', 'Plan de entrenamiento']) {
      await navButton(page, tab).click();
      await expect(navButton(page, tab)).toHaveAttribute('aria-current', 'page');
      await expect(navButton(page, 'Resumen')).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('should filter games (OTB, Online, All)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const otb = page.getByRole('button', { name: 'Mostrar solo partidas de torneo' });
    const online = page.getByRole('button', { name: 'Mostrar solo partidas online' });
    const all = page.getByRole('button', { name: 'Mostrar todas las partidas' });

    for (const selected of [online, all, otb]) {
      await selected.click();
      await expect(selected).toHaveAttribute('aria-pressed', 'true');
      for (const other of [otb, online, all].filter(b => b !== selected)) {
        await expect(other).toHaveAttribute('aria-pressed', 'false');
      }
    }
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.getByRole('button', { name: 'Colapsar barra lateral' }).click();
    const expand = page.getByRole('button', { name: 'Expandir barra lateral' });
    await expect(expand).toBeVisible();

    await expand.click();
    await expect(page.getByRole('button', { name: 'Colapsar barra lateral' })).toBeVisible();
  });

  test('should open and close the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const overview = navButton(page, 'Resumen');

    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(overview).toBeInViewport();

    await page.getByRole('button', { name: 'Cerrar menú' }).click();
    await expect(overview).not.toBeInViewport();
  });
});
