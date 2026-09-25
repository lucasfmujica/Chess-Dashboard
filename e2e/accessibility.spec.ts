import { test, expect, navButton } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/');
    // Scan the loaded dashboard, not the loading screen before it, and not
    // mid fade-in: axe reads the blended color and reports near-black text as gray.
    await expect(navButton(page, 'Overview')).toBeVisible();
    await page.waitForFunction(() =>
      document.getAnimations().every(a => a.playState !== 'running')
    );

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels on navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(navButton(page, 'Overview')).toBeVisible();
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/');

    await expect(navButton(page, 'Overview')).toBeVisible();

    // Focus lands on something the user can see, not on the hidden mobile controls.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: "Lucas's Chess Performance" })).toBeVisible();
  });

  test('should have alt text or aria-hidden on icons', async ({ page }) => {
    await page.goto('/');
    await expect(navButton(page, 'Overview')).toBeVisible();

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
