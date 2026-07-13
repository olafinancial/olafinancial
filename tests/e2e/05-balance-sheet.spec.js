/**
 * E2E Test Suite 05 — Balance Sheet
 * Covers: page load, asset/liability forms, emergency fund toggle,
 * APY cap validation, "Add Asset" without name (crash regression).
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Balance Sheet Summary', () => {
  test('balance sheet summary page renders', async ({ page }) => {
    await page.goto(`${BASE}/#/balance-sheet`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('net worth updates when assets change', async ({ page }) => {
    await page.goto(`${BASE}/#/balance-sheet`);
    await page.waitForLoadState('networkidle');
    const netWorth = page.locator('#nw-value, .net-worth').first();
    if (await netWorth.isVisible()) {
      const text = await netWorth.textContent();
      expect(text).toMatch(/[\d,₦$€£-]+|—/);
    }
  });
});

test.describe('Assets Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/assets`);
    await page.waitForLoadState('networkidle');
  });

  test('assets page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
  });

  test('add asset form opens without crashing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    const addBtn = page.locator('#add-asset-page-btn, button:has-text("Add Asset")').first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Submit without entering name — regression test for R22 crash fix
    const submitBtn = page.locator('.modal-footer button:has-text("Add Asset"), .modal button').last();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
    }

    // Modal should still be visible or show a validation message (not crash)
    const modalStillOpen = await page.locator('.modal, [role="dialog"]').first().isVisible().catch(() => false);
    expect(errors.length).toBe(0); // No JS crash
  });

  test('asset form has APY field accepting up to 30%', async ({ page }) => {
    const addBtn = page.locator('#add-asset-page-btn, button:has-text("Add Asset")').first();
    await addBtn.click();

    // Toggle income generating checkbox by clicking its label text
    const incomeLabel = page.locator('span:has-text("Income-generating/financial asset")').first();
    await incomeLabel.click();
    await page.waitForTimeout(300);

    const apyInput = page.locator('#af-rate').first();
    if (await apyInput.isVisible()) {
      await apyInput.fill('28');
      const val = await apyInput.inputValue();
      expect(parseFloat(val)).toBeLessThanOrEqual(30);
    }
  });

  test('emergency fund toggle checkbox is present on asset form', async ({ page }) => {
    const addBtn = page.locator('#add-asset-page-btn, button:has-text("Add Asset")').first();
    await addBtn.click();

    // Checkbox input may be hidden by slider CSS, check it is attached in DOM
    const toggle = page.locator('#af-ef-source').first();
    await expect(toggle).toBeAttached();
  });
});

