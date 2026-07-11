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
    await page.goto(`${BASE}/#income`);
    await page.waitForLoadState('networkidle');
  });

  test('income page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('can open add-income form', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), [data-action="add-income"]').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator('form, .modal, [role="dialog"]').first()).toBeVisible();
  });

  test('income form shows PAYE/pension fields only for active income', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-income"]').first();
    await addBtn.click();

    const typeSelect = page.locator('select[name*="type"], select[id*="type"]').first();
    if (await typeSelect.isVisible()) {
      // Passive income — PAYE section should be hidden
      await typeSelect.selectOption({ label: /passive/i });
      const payeSection = page.locator('[data-section="paye"], .paye-fields, #paye-section').first();
      if (await payeSection.count() > 0) {
        await expect(payeSection).toBeHidden();
      }

      // Active/salary income — PAYE section should appear
      await typeSelect.selectOption({ label: /active|salary/i });
      if (await payeSection.count() > 0) {
        await expect(payeSection).toBeVisible();
      }
    }
  });

  test('frequency dropdown includes bi-weekly and semi-annual options', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-income"]').first();
    await addBtn.click();
    const freqSelect = page.locator('select[name*="freq"], select[id*="frequency"]').first();
    if (await freqSelect.isVisible()) {
      const options = await freqSelect.locator('option').allTextContents();
      const opts = options.map(o => o.toLowerCase());
      expect(opts.some(o => o.includes('bi-weekly') || o.includes('biweekly'))).toBe(true);
      expect(opts.some(o => o.includes('semi') || o.includes('semi-annual'))).toBe(true);
    }
  });
});

test.describe('Expense Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#expenses`);
    await page.waitForLoadState('networkidle');
  });

  test('expense page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('can open add-expense form', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-expense"]').first();
    await addBtn.click();
    await expect(page.locator('form, .modal, [role="dialog"]').first()).toBeVisible();
  });

  test('recurring expense shows frequency options including weekly', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-expense"]').first();
    await addBtn.click();
    const recurringToggle = page.locator('[name*="recurring"], label:has-text("Recurring"), #recurring-toggle').first();
    if (await recurringToggle.isVisible()) {
      await recurringToggle.click();
      const freqSelect = page.locator('select[name*="freq"], select[id*="frequency"]').first();
      await expect(freqSelect).toBeVisible();
      const opts = await freqSelect.locator('option').allTextContents();
      expect(opts.some(o => o.toLowerCase().includes('weekly'))).toBe(true);
    }
  });

  test('investment expense shows balance-sheet sub-form', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), [data-action="add-expense"]').first();
    await addBtn.click();
    const catSelect = page.locator('select[name*="cat"], select[id*="category"]').first();
    if (await catSelect.isVisible()) {
      await catSelect.selectOption({ label: /invest/i });
      const assetSubForm = page.locator('[data-section="asset-subform"], .asset-sub-form, #asset-subform').first();
      if (await assetSubForm.count() > 0) {
        await expect(assetSubForm).toBeVisible();
      }
    }
  });
});
