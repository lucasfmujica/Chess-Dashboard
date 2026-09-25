import { test, expect } from './fixtures';

/**
 * Adding games moved from the old Analytics tab to a collapsible panel on
 * Overview, which holds the manual form, the PGN import and the Lichess sync.
 */
test.describe('Add / Import Games', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Add \/ Import Games/ }).click();
  });

  test('should open and close PGN import', async ({ page }) => {
    const paste = page.getByText('Paste PGN text below:');

    await page.getByRole('button', { name: /Import Games$/ }).click();
    await expect(paste).toBeVisible();

    await page.getByRole('button', { name: /Close Import/ }).click();
    await expect(paste).toBeHidden();
  });

  test('should open and close the manual game entry form', async ({ page }) => {
    const tournamentName = page.getByText('Tournament Name *');

    await page.getByRole('button', { name: /Add Game$/ }).click();
    await expect(tournamentName).toBeVisible();
    await expect(page.getByText('Your ELO *')).toBeVisible();

    await page.getByRole('button', { name: /Close Form/ }).click();
    await expect(tournamentName).toBeHidden();
  });
});
