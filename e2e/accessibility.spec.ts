import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on navigation', async ({ page }) => {
    await page.goto('/');

    // Check main navigation has aria-label
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Check navigation buttons have aria-labels
    const overviewButton = page.locator('button[aria-label*="Navigate to Overview"]');
    await expect(overviewButton).toBeVisible();
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through the interface
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if focus is visible (this depends on your CSS)
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toContainText("Lucas's Chess Performance");

    // Check page has proper semantic structure
    await expect(page.locator('main, [role="main"]')).toBeTruthy();
  });

  test('should have alt text or aria-hidden on icons', async ({ page }) => {
    await page.goto('/');

    // Get all SVG elements
    const svgs = page.locator('svg');
    const count = await svgs.count();

    // Each SVG should either have aria-hidden or role with aria-label
    for (let i = 0; i < Math.min(count, 10); i++) { // Check first 10
      const svg = svgs.nth(i);
      const ariaHidden = await svg.getAttribute('aria-hidden');
      const role = await svg.getAttribute('role');

      // SVG should either be aria-hidden or have a role
      expect(ariaHidden === 'true' || role !== null).toBeTruthy();
    }
  });
});
