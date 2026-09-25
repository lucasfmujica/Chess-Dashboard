import { test, expect, navButton } from './fixtures';

test.describe('Chess Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Chess Dashboard/i);
    await expect(page.getByRole('heading', { level: 1, name: "Lucas's Chess Performance" })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('should display overview tab by default', async ({ page }) => {
    await expect(navButton(page, 'Overview')).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate between tabs', async ({ page }) => {
    for (const tab of ['ELO Progress', 'Tournaments', 'Repertoire', 'Training Plan']) {
      await navButton(page, tab).click();
      await expect(navButton(page, tab)).toHaveAttribute('aria-current', 'page');
      await expect(navButton(page, 'Overview')).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('should filter games (OTB, Online, All)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const otb = page.getByRole('button', { name: 'Filter to show only over-the-board games' });
    const online = page.getByRole('button', { name: 'Filter to show only online games' });
    const all = page.getByRole('button', { name: 'Filter to show all games' });

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

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    const expand = page.getByRole('button', { name: 'Expand sidebar' });
    await expect(expand).toBeVisible();

    await expand.click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  });

  test('should open and close the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const overview = navButton(page, 'Overview');

    await page.getByRole('button', { name: 'Open mobile menu' }).click();
    await expect(overview).toBeInViewport();

    await page.getByRole('button', { name: 'Close mobile menu' }).click();
    await expect(overview).not.toBeInViewport();
  });
});
