/**
 * E2E Test Suite 10 — New Features
 * Covers: Salary Calculator (#34) and Budget Planner (#32)
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
test.use({ storageState: '.playwright/auth-state.json' });

test.describe('Salary Deductibles Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/salary-calc`);
    await page.waitForLoadState('networkidle');
  });

  test('salary calculator page renders', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    await expect(page.locator('text=Monthly Net Breakdown')).toBeVisible();
  });

  test('adjusting gross salary recalculates take-home pay', async ({ page }) => {
    const grossInput = page.locator('#sc-gross').first();
    await expect(grossInput).toBeVisible();

    // Store initial net pay value
    const initialNetPay = await page.locator('#sc-net-pay').textContent();

    // Fill new gross value
    await grossInput.fill('800000');
    await page.waitForTimeout(500);

    const newNetPay = await page.locator('#sc-net-pay').textContent();
    expect(newNetPay).not.toBe(initialNetPay);
  });

  test('what-if avc input adjusts tax and pension rows', async ({ page }) => {
    const avcInput = page.locator('#sc-avc').first();
    await expect(avcInput).toBeVisible();

    const initialPension = await page.locator('#row-pension').textContent();

    await avcInput.fill('50000');
    await page.waitForTimeout(500);

    const newPension = await page.locator('#row-pension').textContent();
    expect(newPension).not.toBe(initialPension);
  });

  test('tax ledger renders 12 projection months plus annual totals', async ({ page }) => {
    const tableRows = page.locator('#sc-ledger-body tr');
    // 12 months + 1 annual totals row = 13 rows
    await expect(tableRows).toHaveCount(13);
  });
});

test.describe('Budget Planner (50/30/20)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/#/budget`);
    await page.waitForLoadState('networkidle');
  });

  test('budget page renders month selector and progress rings', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    await expect(page.locator('#budget-month-select')).toBeVisible();
    await expect(page.locator('#ring-needs-container svg')).toBeVisible();
  });

  test('budget utilization bar is visible', async ({ page }) => {
    await expect(page.locator('#utilization-bar-fill')).toBeVisible();
  });

  test('category table is present', async ({ page }) => {
    const table = page.locator('#budget-categories-table').first();
    await expect(table).toBeVisible();
  });

  test('custom targets override form works and saves target', async ({ page }) => {
    const needsTarget = page.locator('#bc-target-needs').first();
    const wantsTarget = page.locator('#bc-target-wants').first();
    const savingsTarget = page.locator('#bc-target-savings').first();

    await needsTarget.fill('40');
    await wantsTarget.fill('40');
    await savingsTarget.fill('20');

    const applyBtn = page.locator('#budget-custom-form button[type="submit"]').first();
    await applyBtn.click();
    await page.waitForTimeout(300);

    const statusBadge = page.locator('#budget-allocation-status').first();
    await expect(statusBadge).toContainText('Custom Mode: 40/40/20');
  });
});
