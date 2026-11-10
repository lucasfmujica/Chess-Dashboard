import { test, expect } from './fixtures';

/**
 * Adding games moved from the old Analytics tab to a collapsible panel on
 * Overview, which holds the manual form, the PGN import and the Lichess sync.
 */
test.describe('Cargar partidas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Cargar partidas/ }).click();
  });

  test('should open and close PGN import', async ({ page }) => {
    const paste = page.getByText('Pegá el PGN acá:');

    await page.getByRole('button', { name: /^Importar partidas$/ }).click();
    await expect(paste).toBeVisible();

    await page.getByRole('button', { name: /Cerrar importación/ }).click();
    await expect(paste).toBeHidden();
  });

  test('should open and close the manual game entry form', async ({ page }) => {
    const tournamentName = page.getByText('Torneo *');

    await page.getByRole('button', { name: /^Cargar partida$/ }).click();
    await expect(tournamentName).toBeVisible();
    await expect(page.getByText('Tu ELO *')).toBeVisible();

    await page.getByRole('button', { name: /Cerrar formulario/ }).click();
    await expect(tournamentName).toBeHidden();
  });
});
