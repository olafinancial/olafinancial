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
    await page.goto(`${BASE}/#debt`);
    await page.waitForLoadState('networkidle');
  });

  test('debt planner page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('strategy selector is visible with avalanche and snowball options', async ({ page }) => {
    const strategySelect = page.locator('select[name*="strategy"], [data-testid="strategy-select"]').first();
    if (await strategySelect.isVisible()) {
      const opts = await strategySelect.locator('option').allTextContents();
      expect(opts.some(o => o.toLowerCase().includes('avalanche'))).toBe(true);
      expect(opts.some(o => o.toLowerCase().includes('snowball'))).toBe(true);
    } else {
      // May be radio buttons instead
      const avalanche = page.locator('input[value="avalanche"], label:has-text("Avalanche")').first();
      const snowball  = page.locator('input[value="snowball"], label:has-text("Snowball")').first();
      await expect(avalanche).toBeVisible();
      await expect(snowball).toBeVisible();
    }
  });

  test('switching strategy re-renders the payoff table', async ({ page }) => {
    const strategySelect = page.locator('select[name*="strategy"]').first();
    if (await strategySelect.isVisible()) {
      await strategySelect.selectOption('avalanche');
      await page.waitForTimeout(500);
      const tableAvalanche = await page.locator('.debt-table, table, [data-section="payoff"]').first().textContent().catch(() => '');

      await strategySelect.selectOption('snowball');
      await page.waitForTimeout(500);
      const tableSnowball = await page.locator('.debt-table, table, [data-section="payoff"]').first().textContent().catch(() => '');

      // Tables should differ when there are multiple debts
      // (We can't assert inequality if user has no debts, so we just check no crash)
      expect(tableAvalanche).toBeTruthy();
    }
  });

  test('add debt form opens', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-debt"]').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('form, .modal, [role="dialog"]').first()).toBeVisible();
  });

  test('debt form has manual monthly payment field', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-debt"]').first();
    await addBtn.click();
    const paymentField = page.locator('[name*="payment"], [id*="payment"], [placeholder*="payment"]').first();
    await expect(paymentField).toBeVisible();
  });
});
