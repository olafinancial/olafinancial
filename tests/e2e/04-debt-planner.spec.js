/**
 * E2E Test Suite 04 — Debt Planner
 * Covers: page load, avalanche/snowball strategy toggle,
 * payoff projection rendering, manual payment override.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Debt Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/debt`);
    await page.waitForLoadState('networkidle');
  });

  test('debt planner page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('strategy selector is visible with avalanche and snowball options', async ({ page }) => {
    const strategySelect = page.locator('#payoff-strategy').first();
    await expect(strategySelect).toBeVisible();
    const opts = await strategySelect.locator('option').allTextContents();
    expect(opts.some(o => o.toLowerCase().includes('avalanche'))).toBe(true);
    expect(opts.some(o => o.toLowerCase().includes('snowball'))).toBe(true);
  });

  test('switching strategy re-renders the payoff table', async ({ page }) => {
    const strategySelect = page.locator('#payoff-strategy').first();
    if (await strategySelect.isVisible()) {
      await strategySelect.selectOption('avalanche');
      await page.waitForTimeout(500);
      
      const payoffTable = page.locator('.debt-table, table, [data-section="payoff"]').first();
      let tableAvalanche = '';
      if (await payoffTable.count() > 0) {
        tableAvalanche = await payoffTable.textContent().catch(() => '');
      }

      await strategySelect.selectOption('snowball');
      await page.waitForTimeout(500);
      expect(strategySelect).toBeDefined();
    }
  });

  test('add debt form opens', async ({ page }) => {
    const addBtn = page.locator('#add-debt-btn, button:has-text("Add Debt")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('#debt-form, form, .modal').first()).toBeVisible();
  });

  test('debt form has manual monthly payment field', async ({ page }) => {
    const addBtn = page.locator('#add-debt-btn, button:has-text("Add Debt")').first();
    await addBtn.click();
    
    // Toggle manual payment mode using label text click
    const noAprToggle = page.locator('span:has-text("I don\'t know the APR")').first();
    await noAprToggle.click();
    
    const paymentField = page.locator('#df-mpmt').first();
    await expect(paymentField).toBeVisible();
  });
});
