import { test, expect } from '@playwright/test';

test.describe('Modal System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to Analytics tab where we have modals
    await page.click('text=Analytics');
  });

  test('should open and close PGN import modal', async ({ page }) => {
    // Click "Import Games" button
    await page.click('text=Import Games');

    // Check if modal/section is visible
    await expect(page.locator('text=Paste PGN text below')).toBeVisible();

    // Close by clicking the close button
    await page.click('text=Close Import');

    // Modal should be hidden
    await expect(page.locator('text=Paste PGN text below')).not.toBeVisible();
  });

  test('should open manual game entry form', async ({ page }) => {
    // Click "Add Game" button
    await page.click('text=Add Game');

    // Check if form is visible
    await expect(page.locator('text=Tournament Name *')).toBeVisible();
    await expect(page.locator('text=Your ELO *')).toBeVisible();

    // Close form
    await page.click('text=Cancel');

    // Form should be hidden
    await expect(page.locator('text=Tournament Name *')).not.toBeVisible();
  });
});
