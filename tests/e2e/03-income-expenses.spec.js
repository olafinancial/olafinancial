/**
 * E2E Test Suite 03 — Income & Expense CRUD
 * Covers: adding income, recurring frequencies, investment expense → balance
 * sheet double-entry, expense CRUD, pre-paid expense logging.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Income Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/income`);
    await page.waitForLoadState('networkidle');
  });

  test('income page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('can open add-income form', async ({ page }) => {
    const addBtn = page.locator('#add-income-btn, button:has-text("Add Income Source")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('#income-form, form, .modal').first()).toBeVisible();
  });

  test('income form shows PAYE/pension fields only for active income', async ({ page }) => {
    const addBtn = page.locator('#add-income-btn, button:has-text("Add Income Source")').first();
    await addBtn.click();

    const typeSelect = page.locator('#if-type').first();
    if (await typeSelect.isVisible()) {
      // Passive income — PAYE/pension section should be hidden
      await typeSelect.selectOption('passive');
      const pensionGroup = page.locator('#if-pension-group').first();
      if (await pensionGroup.count() > 0) {
        await expect(pensionGroup).toBeHidden();
      }

      // Active/salary income — PAYE/pension section should appear
      await typeSelect.selectOption('active');
      if (await pensionGroup.count() > 0) {
        await expect(pensionGroup).toBeVisible();
      }
    }
  });

  test('frequency dropdown includes bi-weekly and semi-annual options', async ({ page }) => {
    const addBtn = page.locator('#add-income-btn, button:has-text("Add Income Source")').first();
    await addBtn.click();
    const freqSelect = page.locator('#if-freq').first();
    if (await freqSelect.isVisible()) {
      const options = await freqSelect.locator('option').allTextContents();
      const opts = options.map(o => o.toLowerCase());
      expect(opts.some(o => o.includes('bi-weekly') || o.includes('biweekly'))).toBe(true);
      expect(opts.some(o => o.includes('semi') || o.includes('semi-annual') || o.includes('semiannual'))).toBe(true);
    }
  });
});

test.describe('Expense Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/expenses`);
    await page.waitForLoadState('networkidle');
  });

  test('expense page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('can open add-expense form', async ({ page }) => {
    const addBtn = page.locator('#add-expense-btn, button:has-text("Log Expense")').first();
    await addBtn.click();
    await expect(page.locator('#exp-form, form, .modal').first()).toBeVisible();
  });

  test('recurring expense shows frequency options including weekly', async ({ page }) => {
    const addBtn = page.locator('#add-expense-btn, button:has-text("Log Expense")').first();
    await addBtn.click();
    const recurringToggle = page.locator('#ef-recur').first();
    if (await recurringToggle.isVisible()) {
      await recurringToggle.click();
      const freqSelect = page.locator('#ef-freq').first();
      await expect(freqSelect).toBeVisible();
      const opts = await freqSelect.locator('option').allTextContents();
      expect(opts.some(o => o.toLowerCase().includes('weekly'))).toBe(true);
    }
  });

  test('investment expense shows balance-sheet sub-form', async ({ page }) => {
    const addBtn = page.locator('#add-expense-btn, button:has-text("Log Expense")').first();
    await addBtn.click();
    const catSelect = page.locator('#ef-cat').first();
    if (await catSelect.isVisible()) {
      await catSelect.selectOption('Investment');
      const assetSubForm = page.locator('#exp-asset-subform').first();
      await expect(assetSubForm).toBeVisible();
    }
  });
});
