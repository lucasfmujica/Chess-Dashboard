import { test, expect } from '@playwright/test';

test.describe('Chess Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard homepage', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Chess Dashboard/i);

    // Check main header is visible
    await expect(page.locator('h1')).toContainText("Lucas's Chess Performance");

    // Check sidebar is present
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('should display overview tab by default', async ({ page }) => {
    // Overview should be the default active tab
    const overviewButton = page.locator('button', { hasText: 'Overview' });
    await expect(overviewButton).toHaveClass(/from-emerald-500/);
  });

  test('should navigate between tabs', async ({ page }) => {
    // Click on Rating tab
    await page.click('text=ELO Progress');
    await expect(page.locator('button', { hasText: 'ELO Progress' })).toHaveClass(/from-emerald-500/);

    // Click on Tournaments tab
    await page.click('text=Tournaments');
    await expect(page.locator('button', { hasText: 'Tournaments' })).toHaveClass(/from-emerald-500/);

    // Click on Analytics tab
    await page.click('text=Analytics');
    await expect(page.locator('button', { hasText: 'Analytics' })).toHaveClass(/from-emerald-500/);
  });

  test('should filter games (OTB, Online, All)', async ({ page }) => {
    // Test is only visible on desktop
    await page.setViewportSize({ width: 1280, height: 720 });

    // Click OTB filter
    const otbButton = page.locator('button[aria-label*="over-the-board"]');
    await otbButton.click();
    await expect(otbButton).toHaveAttribute('aria-pressed', 'true');

    // Click Online filter
    const onlineButton = page.locator('button[aria-label*="online games"]');
    await onlineButton.click();
    await expect(onlineButton).toHaveAttribute('aria-pressed', 'true');

    // Click All filter
    const allButton = page.locator('button[aria-label*="all games"]');
    await allButton.click();
    await expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    // Desktop only
    await page.setViewportSize({ width: 1280, height: 720 });

    // Find collapse button
    const collapseButton = page.locator('button[aria-label*="Collapse sidebar"]');
    await collapseButton.click();

    // Check if sidebar is collapsed by looking for aria-label change
    await expect(page.locator('button[aria-label*="Expand sidebar"]')).toBeVisible();
  });

  test('should open mobile menu', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Click hamburger menu
    await page.click('button[aria-label="Open mobile menu"]');

    // Check if sidebar is visible
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Close mobile menu
    await page.click('button[aria-label="Close mobile menu"]');
  });
});
